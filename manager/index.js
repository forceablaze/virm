'use strict'

import Category from './Category';

import Device from '../module/device/device'
import VirtualMachine from '../module/device/vm';
import HardDisk from '../module/device/disk';
import PCIDevice from '../module/device/pci';
import VFIODevice from '../module/device/pci/VFIODevice';
import RouteDevice from '../module/device/net/route';
import NetworkDevice from '../module/device/net';
import TapDevice from '../module/device/net/TapDevice';

import Agent from '../module/agent';
import Configuration from '../module/conf';
import SubProcess from '../module/process';

import CONF from '../conf';
import { delay, retry, subnetize } from '../utils';

const CONF_PATH = 'virmanager.conf';

const fs = require('fs');
const readline = require('readline');

const network = require('network');
const cidrjs = require('cidr-js');
const ip = require('ip');

const { cidrize, getRandomIntInclusive } = require('../utils');

let __configuration = new Configuration();

const PROTOTYPE_MAP = {
    "VM": VirtualMachine.prototype,
    "DISK": HardDisk.prototype,
    "PCI": PCIDevice.prototype,
    "NET": NetworkDevice.prototype,
    "ROUTE": RouteDevice.prototype
};

/* the instance of Manager */
let __instance = null;

/* the instance of Agent
 * vm uuid to Agent
 */
let __agents = {};

/* the instance of RouteDevice
 * vm uuid to RouteDevice
 */
let __routes = {};

class Manager
{
    constructor() {
        this.categoryList = null;
        this.loadConfiguration();
    }

    loadConfiguration() {
        console.log("load configuration");

        try {
            let obj = __configuration.unserialize(CONF_PATH);

            __configuration.importConfiguration(obj);

            this.categoryList = __configuration.get('categories');

            /* set the __proto__ of each element to Category */
            this.categoryList.forEach((element) => {
                Object.setPrototypeOf(element, Category.prototype);
            });
        } catch(e) {
            if(e.code == 'ENOENT') {
                console.log("configuration file not existed");
                this.initializeConfiguration();
                return;
            }
            console.log(e);
        }
    }

    initializeConfiguration() {
        try { [].undef () } catch (e) {
            console.log (e.stack.split ('\n')[1].split (/\s+/)[2]);
        }

        __configuration = new Configuration();

        /* device list group by category */
        this.categoryList = [];
        this.categoryList.push(new Category('VM', VirtualMachine)); 
        this.categoryList.push(new Category('DISK', HardDisk)); 
        this.categoryList.push(new Category('PCI', PCIDevice)); 
        this.categoryList.push(new Category('NET', NetworkDevice));
        this.categoryList.push(new Category('ROUTE', RouteDevice));

        __configuration.push('categories', this.categoryList);
    }

    saveConfiguration() {
        __configuration.serialize(CONF_PATH);
    }

    create(category, options) {
        switch(category.toLowerCase()) {
            case "vm":
                this.createVM(options.name);
                break;
            case "disk":
                this.createDisk(
                        options.path,
                        options.size);
                break;
            case "pci":
                this.createPCIDevice(
                        options.busnum);
            case "net":
                this.createNetworkDevice();
                break;
            case "route":
                this.createRouteDevice(
                        options.net,
                        options.mask,
                        options.gw,
                        options.uuid);
                break;
            /* no category list type */
            case "agent":
                this.createAgent(options.uuid);
                break;
            case 'damain':
                this.createDAMain(options.addresses);
                break;
            default:
                console.log("Not support " + category + " creation.");
                break;
        }
    }

    createVM(name, cpu = 2, memory = 2048,
            vncAddress = "0.0.0.0",
            vncPort = "0") {

        let vm = new VirtualMachine(name);
        vm.setCPUCore(cpu);
        vm.setMemory(memory);
        vm.setVNC(vncAddress, vncPort);

        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == 'VM'
        });

        category.push(vm);
        this.saveConfiguration();
    }

    createDisk(path = undefined, size = undefined) {
        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == 'DISK'
        });


        if(path !== undefined) {
            let hd = new HardDisk(path, size);

            try {
                hd.createHardDisk();
                console.log(hd.toString());
            } catch(e) {
                if(e === 'EEXIST') {
                    console.log("Image existed");
                }
            }

            let newDisk = true;
            for(let key in category.list) {
                let disk = category.list[key];
                Object.setPrototypeOf(disk,
                        PROTOTYPE_MAP[category.name]);

                if(disk.path === hd.path) {
                    newDisk = false;
                }
            }

            if(newDisk) {
                console.log("Save new disk to configuration.");
                category.push(hd);
            }

            this.saveConfiguration();
        }
    }

    createPCIDevice(busnum = undefined, deviceId = undefined) {
        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == 'PCI'
        });

        if(busnum === undefined)
            return;

        let pcidev = new PCIDevice(busnum);

        let device = null;
        for(let key in category.list) {
            device = category.list[key];
            Object.setPrototypeOf(device,
                    PCIDevice.prototype);
            if(device.busnum === busnum) {
                console.log("specified busnum already existed.");
                return;
            }
        }

        category.push(pcidev);

        this.saveConfiguration();
    }

    createNetworkDevice() {
        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == 'NET'
        });

        let netdev= new NetworkDevice(new TapDevice());
        console.log(netdev);

        category.push(netdev);
        this.saveConfiguration();
    }

    createRouteDevice(net, mask, gw, netdev_uuid) {
        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == 'ROUTE'
        });

        console.log(arguments);
        let netdev = this.findDevice('net', netdev_uuid);

        let route = new RouteDevice(net, mask, gw, netdev);
        console.log(route);

        category.push(route);
        this.saveConfiguration();
    }

    list(categoryName) {
        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == categoryName.toUpperCase();
        });

        if(category === undefined)
            return;

        for(let key in category.list) {
            Object.setPrototypeOf(category.list[key], Device.prototype);
            console.log(category.list[key].uuid);
        }
    }

    findDevice(categoryName, uuid) {
        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == categoryName.toUpperCase();
        });

        let device = null;
        for(let key in category.list) {
            if(key == uuid)
                device = category.list[key];
        }

        if(!device)
            return null;

        Object.setPrototypeOf(device,
                PROTOTYPE_MAP[categoryName.toUpperCase()]);

        return device;
    }

    addDeviceToVM(vm_uuid, categoryName, dev_uuid) {
        let vm = this.findDevice('vm', vm_uuid);
        let dev = this.findDevice(categoryName, dev_uuid);

        vm.addDevice(dev);

        this.saveConfiguration();
    }

    __start(categoryName, uuid) {
        let device = this.findDevice(categoryName, uuid);

        if(device) {
            console.log("start: " + device.toString());

            try {
                device.start();
            } catch(e) {
                console.log(e);
            }
        }
    }

    start(categoryName, uuid) {
        switch(categoryName.toLowerCase()) {
            case "vm":
            case "disk":
            case "pci":
            case "net":
            case "route":
                this.__start(categoryName, uuid);
                break;
            /* no category list type */
            case 'damain':
                this.startupDAMain(uuid);
                break;
            default:
                console.log("Not support " + categoryName + " creation.");
                break;
        }
    }

    __stop(categoryName, uuid) {
        let device = this.findDevice(categoryName, uuid);

        if(device) {
            console.log("stop: " + device.toString());

            try {
                device.stop();
            } catch(e) {
                console.log(e);
            }
        }
    }

    stop(categoryName, uuid) {
        switch(categoryName.toLowerCase()) {
            case "vm":
            case "disk":
            case "pci":
            case "net":
            case "route":
                this.__stop(categoryName, uuid);
                break;
            /* no category list type */
            case 'damain':
                /* remove route and meta before stop damain */
                {
                    this.destroyRoute(uuid);
                    try {
                        fs.unlinkSync(CONF.RUN_PATH + '/damain/' + uuid);
                    } catch(err) {
                        console.log(err);
                    }
                    this.__stop('vm', uuid);
                }
                break;
            default:
                console.log("Not support " + categoryName + " creation.");
                break;
        }
    }

    __createAgent(vm) {
        if(vm) {
            if(__agents[vm.uuid] === undefined)
                __agents[vm.uuid] = new Agent(vm);
            return __agents[vm.uuid];
        }
    }

    createAgent(uuid) {
        let vm = this.findDevice('vm', uuid);

        return this.__createAgent(vm);
    }

    createRoute(uuid, ip) {
        let vm = this.findDevice('vm', uuid);

        if(!vm)
            return;

        let netdevs = vm.getDevices('NetworkDevice');

        if(__routes[vm.uuid] === undefined)
            __routes[vm.uuid] = new RouteDevice(
                    ip, '255.255.255.255', undefined, netdevs[0]);

        return __routes[vm.uuid];
    }

    destroyRoute(uuid) {
        let vm = this.findDevice('vm', uuid);

        if(!vm)
            return;

        if(__routes[vm.uuid] !== undefined) {
            let route =  __routes[vm.uuid];
            route.down();
        }
        __routes[vm.uuid] = undefined;
    }

    createDAMain(pciAddresses) {
        let vm = new VirtualMachine('DAMain');

        let args = [
            'create',
            '-f', 'qcow2', '-b', CONF.IMAGE_PATH + '/damain-1.10',
            CONF.IMAGE_PATH + '/' + `${vm.uuid}`
        ];

        let createSnapshot = new SubProcess(CONF.BIN_PATH + '/qemu-img', args);
        let result = createSnapshot.runSync();
        console.log(result);

        vm.setCPUCore(2);
        vm.setMemory(512);
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
        let category = this.categoryList.find((obj) => {
            return obj.name == 'VM'
        });

        category.push(vm);
        this.saveConfiguration();
    }

    setVMNetworkInterface(client, uuid, cidr) {
        return new Promise((resolve, reject) => {
            let vm = this.findDevice('vm', uuid);
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


    __startupDAMain(uuid, cidr) {
        let vm = this.findDevice('vm', uuid);

        let task = () => {
            let client = new Agent(vm);

            let tryGetNICAddress = () => {
                client.getNICAddress('eth0')('ipv4').then((ip) => {
                    console.log('ipv4:' + ip);

                    let meta = {};
                    meta['ip'] = ip;
                    meta['mask'] = subnetize(cidr.split('/')[1]);

                    let str = JSON.stringify(meta, null, 2);
                    fs.writeFile(CONF.RUN_PATH + '/damain/' + uuid, str,
                            'utf8', (err) => {
                        if (err) {
                            console.log(err);
                        }
                    });

                    /* set the route to the guest */
                    let route = this.createRoute(uuid, ip);
                    route.up();
                }).catch((err) => {
                    if(!vm.instance)
                        return;
                    delay(1000)('retry').then((result) => {
                        tryGetNICAddress();
                    });
                });
            };

            /* setting NIC with client */
            this.setVMNetworkInterface(client, uuid, cidr).then((value) => {
                tryGetNICAddress();
            });
        };

        if(!vm) {
            throw new Error('No VM found');
        }

        vm.start()
            .then((instance) => {
                task();
            })
            .catch((err) => {
                console.log(err);
            });
    }

    startupDAMain(uuid) {
        network.get_active_interface((err, obj) => {
            if(!err) {
                /* get current cidr address */
                ip.subnet(obj.ip_address, obj.netmask);
                let maskSize = cidrize(obj.netmask);
                let cidraddr = obj.ip_address + '/' + maskSize;
                console.log('current active ip ' + cidraddr);

                let cidr = new cidrjs();
                let list = cidr.list(cidraddr);

                let addr = list[getRandomIntInclusive(0, list.length - 1)];
                while(addr == obj.ip_address)
                    addr = list[getRandomIntInclusive(0, list.length - 1)];

                cidraddr = addr + '/' + maskSize;
                console.log('set subnet ' + cidraddr + ' to damain');
                try {
                    this.__startupDAMain(uuid, cidraddr);
                } catch(err) {
                    console.log(err);
                }
            }
        });
    }

    discoveryiSCSITarget(uuid) {
        return new Promise((resolve, reject) => {

            let vm = this.findDevice('vm', uuid);

            if(vm.instance == null) {
                reject(null);
            }

            let client = this.__createAgent(vm);

            let discoveryTarget = (ip) => {
                return new Promise((resolve, reject) => {
                    let discovery =  new SubProcess('iscsiadm',
                            ['-m', 'discovery', '-t', 'st', '-p', ip]);

                    discovery.run();
                    let rl = readline.createInterface({
                        input: discovery.proc.stdout
                    });

                    /* wait for 5s*/
                    let to = setTimeout(() => {
                        console.log('discovery target timeout');
                        rl.close();
                        discovery.interrupt();
                        reject('ISCSI_ERR_TRANS');
                    }, 5000);

                    rl.on('line', (line) => {
                        clearTimeout(to);
                        let target = line.split(' ')[1].trim();

                        resolve(target);
                        rl.close();
                   });
                });
            }

            let discovery = () => {
                client.getNICAddress('eth0')('ipv4')
                    .then((ip) => {
                        console.log('try to connect to ' + ip);

                        discoveryTarget(ip)
                            .then((target) => { resolve(target) })
                            .catch((err) => { reject(err) });
                    })
                    .catch((err) => {
                        console.log(err);
                        if(err.errno !== 'ECONNREFUSED') {
                            delay(1000)('retry').then((r) => {
                                console.log('retry');
                                discovery();
                            });
                        }
                    });
            };
            discovery();
        });
    }

    connectDAMain(uuid) {
        /* errHandler for iSCSI login */
        let errHandler = (ret) => {
            switch(ret.status) {
                case 0:
                    console.log('ISCSI_SUCCESS');
                    break;
                case 4:
                    console.log('ISCSI_ERR_TRANS');
                    break;
                case 8:
                    console.log('ISCSI_ERR_TRANS_TIMEOUT');
                    break;
                default:
                    console.log(ret.status);
            }
        }

        this.discoveryiSCSITarget(uuid)
            .then((target) => {
                console.log('connect to ' + target);

                let login = new SubProcess('iscsiadm',
                        ['-m', 'node', '-T', target, '--login']);
                let ret = login.runSync();
                errHandler(ret);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    disconnectDAMain(uuid) {
        /* errHandler for iSCSI login */
        let errHandler = (ret) => {
            switch(ret.status) {
                case 0:
                    console.log('ISCSI_SUCCESS');
                    break;
                case 4:
                    console.log('ISCSI_ERR_TRANS');
                    break;
                case 8:
                    console.log('ISCSI_ERR_TRANS_TIMEOUT');
                    break;
                default:
                    console.log(ret.status);
            }
        }

        this.discoveryiSCSITarget(uuid)
            .then((target) => {
                console.log('connect to ' + target);

                let login = new SubProcess('iscsiadm',
                        ['-m', 'node', '-T', target, '--logout']);
                let ret = login.runSync();
                errHandler(ret);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    test(str) {
        /*
        let pcidev = new PCIDevice("03:00.0");

        let vfiodev = new VFIODevice(pcidev);
        vfiodev.unbind();

        pcidev.bind('rtsx_pci');
        */
        /*
        let netdev= new NetworkDevice(new TapDevice());
        netdev.up();
        let route = new RouteDevice(
                '192.168.68.137',
                '255.255.255.255', undefined, netdev);
        route.up();
        route.down();

        netdev.down();
        */
    }

    static getInstance() {
        if(!__instance) {
            __instance = new Manager();
        }
        return __instance;
    }
}

export default Manager;
