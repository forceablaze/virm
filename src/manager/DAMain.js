'use strict'

const cidrjs = require('cidr-js');
const ip = require('ip');
import { delay, retry, subnetize, cidrize, getRandomIntInclusive } from '../utils';

import fs from 'fs';
import os from 'os';

import VirtualMachine from '../module/device/vm';
import HardDisk from '../module/device/disk';
import PCIDevice from '../module/device/pci';
import NetworkDevice from '../module/device/net';
import BridgeDevice from '../module/device/net/BridgeDevice';
import TapDevice from '../module/device/net/TapDevice';

import Agent from '../module/agent';
import QMP from '../module/qmp';
import SubProcess from '../module/process';
import CONF from '../conf';

const DAMAIN_NET_BRIDGE = 'da0';
const DAMAIN_VER = 'latest';

const cpus = os.cpus().map((cpu, index) => {
    cpu.index = index;
    return cpu;
});

/* exclude the first cpu */
/* TODO each vm should be has it own cpu pool */
const CPU_POOL = cpus.slice(1, cpus.length);
const CPU_USED = [];

let attachCPU = (num_of_cpu, thread_id) => {

    let cpus = [];

    for(let i = 0; i < num_of_cpu; i++) {
        let cpu = CPU_POOL[0];

        /* no enough cpu resource to attach */
        if(cpu === undefined)
            return;

        /* get a cpu from CPU_POOL and push to cpus */
        cpus.push(cpu);
        CPU_USED.push(cpu);
        CPU_POOL.splice(0, 1);
    }

    if(cpus.length == 0)
        return;

    let corelist = cpus.map((cpu) => {
        return cpu.index;
    }).toString();

    let args = [
        '-cp', corelist,
        thread_id
    ];

    let createSnapshot = new SubProcess('taskset', args);
    let result = createSnapshot.runSync();
    console.log(result);
}

let createDAMain = (manager, pciAddresses) => {
    let vm = new VirtualMachine('DAMain');

    let args = [
        'create',
        '-f', 'qcow2', '-b', CONF.IMAGE_PATH + '/damain-' + DAMAIN_VER,
        CONF.IMAGE_PATH + '/' + `${vm.uuid}`
    ];

    let createSnapshot = new SubProcess(CONF.BIN_PATH + '/qemu-img', args);
    let result = createSnapshot.runSync();
    console.log(result);


    vm.setCPUCore(cpus.length / 2);
    vm.setMemory(4096);
    vm.addDevice(new HardDisk(CONF.IMAGE_PATH + '/' + vm.uuid));

    let netdev= new NetworkDevice(new TapDevice());
    vm.addDevice(netdev);

    if(pciAddresses !== undefined) {
        let addresses = pciAddresses.split(',');

        addresses.forEach((addr) => {
            let pcidev = new PCIDevice(addr);
            vm.addDevice(pcidev);
        });
    }

    /* get the category list */
    let category = manager.categoryList.find((obj) => {
        return obj.name == 'VM'
    });

    category.push(vm);
    manager.saveConfiguration();
}

let setVMNetworkInterface = (manager, client, uuid, cidr) => {
    return new Promise((resolve, reject) => {
        let vm = manager.findDevice('vm', uuid);
        let ip = undefined;
        let mask = undefined;

        if(vm === undefined) {
            console.log('No VM found.');
            return;
        }

        if(vm.instance == null) {
            console.log('VM no running');
            return;
        }

        if(cidr === undefined) {
            ip = '192.168.1.1';
            mask = '255.255.255.0'
        } else {
            let split = cidr.split('/');
            ip = split[0];
            mask = subnetize(split[1]);
        }

        console.log(ip);
        console.log(mask);

        let setNIC = () => {
            client.sendTask('/sbin/ifconfig eth0 ' + ip +
                    ' netmask ' + mask, 'done')
            .then((value) => {
                if(value === 'done') {
                    console.log('send task success');
                    resolve('done');
                }
            }).catch((err) => {
                if(!vm.instance)
                    return;
                delay(2000)('reconnect').then((result) => {
                    setNIC();
                });
            });
        };

        let sync = () => {
            client.getAgentVersion().then((value) => {
                console.log('Get agent value: ' + value);
                setNIC();
            }).catch((err) => {
                if(!vm.instance)
                    return;
                delay(2000)('reconnect').then((result) => {
                    sync();
                });
            });
        };

        sync();
    });
}

let __startupDAMain = (manager, uuid, cidr) => {
    let vm = manager.findDevice('vm', uuid);

    let task = (instance) => {
        /* listen QMP event */
        let ev_handler = {
            'vnc_connnected': (ev) => { console.log(ev) },
            'powerdown': (ev) => { console.log(ev) },
            'shutdown': (ev) => {
                vm.status.shutdown = true;
            },
            'stop': (ev) => {
                console.log(ev);
                if(vm.status.shutdown)
                     manager.stop('damain', vm.uuid);
            },
        };
        manager.createQMP(vm.uuid, ev_handler).then((qmp) => {
            qmp.execute('query-cpus', (obj) => {
                obj.forEach((cpu, index) => {
                    console.log('CPU:' + cpu.CPU + ', thread_id:' + cpu.thread_id);
                    /* assign 1 cpu to thread */
                    attachCPU(1, cpu.thread_id);
                });
            });
        }).catch((err) => { console.log(err) });

        let client = manager.createAgent(uuid);
        let tryGetNICAddress = () => {
            client.getNICAddress('eth0')('ipv4').then((ip) => {
                console.log('ipv4:' + ip);

                let meta = {};
                meta['ip'] = ip;
                meta['mask'] = subnetize(cidr.split('/')[1]);
                meta['pid'] = instance.pid;

                let str = JSON.stringify(meta, null, 2);
                fs.writeFile(CONF.RUN_PATH + '/damain/' + uuid, str,
                        'utf8', (err) => {
                    if (err) {
                        console.log(err);
                    }
                });
            }).catch((err) => {
                if(!vm.instance)
                    return;
                delay(1000)('retry').then((result) => {
                    tryGetNICAddress();
                });
            });
        };

        /* setting NIC with client */
        setVMNetworkInterface(manager, client, uuid, cidr).then((value) => {
            tryGetNICAddress();
        });
    };

    if(!vm) {
        throw new Error('No VM found');
    }

    vm.start()
        .then((instance) => {
            task(instance);
            let netdevs = vm.getDevices('NetworkDevice');
            console.log(netdevs);

            let br = new BridgeDevice(DAMAIN_NET_BRIDGE);
            try {
                br.addif(netdevs[0]);
            } catch (err) {
                console.log(err)
            }

            vm.addDevice(br);
        })
        .catch((err) => {
            console.log(err);
        });
}

let startupDAMain = (manager, uuid) => {
    /*
    let netdevs = os.networkInterfaces();
    if(netdevs[DAMAIN_NET_BRIDGE] === undefined) {
        throw new Error('No bridge found.');
    }

    let da0 = netdevs[DAMAIN_NET_BRIDGE];
    */
    let item = {
        'family': 'IPv4',
        'address': '192.168.61.1',
        'netmask': '255.255.255.0',
    };

//    da0.forEach((item) => {
        if(item.family === 'IPv4') {
            let maskSize = cidrize(item.netmask);
            let cidraddr = item.address + '/' + maskSize;
            console.log('bridge ip: ' + cidraddr);

            let cidr = new cidrjs();
            let list = cidr.list(cidraddr);

            let addr = list[getRandomIntInclusive(0, list.length - 1)];
            while(addr == item.address)
                addr = list[getRandomIntInclusive(0, list.length - 1)];

            cidraddr = addr + '/' + maskSize;
            console.log('set subnet ' + cidraddr + ' to damain');
            try {
                __startupDAMain(manager, uuid, cidraddr);
            } catch(err) {
                console.log(err);
            }
        }
//    });
}

let stopDAMain = (manager, uuid) => {
    let vm = manager.findDevice('vm', uuid);

    if(!vm.instance)
        return;

    /* remove netdev from bridge and meta before stop damain */
    let netdevs = vm.getDevices('NetworkDevice');

    let brs = vm.getDevices('BridgeDevice');
    Object.setPrototypeOf(brs[0], BridgeDevice.prototype);
    brs[0].delif(netdevs[0]);

    try {
        fs.unlinkSync(CONF.RUN_PATH + '/damain/' + uuid);
    } catch(err) {
        console.log(err);
    }
    manager.stop('vm', uuid);
}

export { createDAMain, startupDAMain, stopDAMain };
