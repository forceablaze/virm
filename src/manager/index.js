'use strict'

import Category from './Category';

import Device from '../module/device/device'
import VirtualMachine from '../module/device/vm';
import HardDisk from '../module/device/disk';
import PCIDevice from '../module/device/pci';
import VFIODevice from '../module/device/pci/VFIODevice';
import RouteDevice from '../module/device/net/route';
import NetworkDevice from '../module/device/net';
import BridgeDevice from '../module/device/net/BridgeDevice';
import TapDevice from '../module/device/net/TapDevice';

import Agent from '../module/agent';
import QMP from '../module/qmp';
import Configuration from '../module/conf';
import SubProcess from '../module/process';

import CONF from '../conf';
import { cidrize, getRandomIntInclusive, delay, retry, subnetize } from '../utils';
import { createDAMain, startupDAMain, stopDAMain } from './DAMain';

const fs = require('fs');
const readline = require('readline');

import os from 'os';
const cidrjs = require('cidr-js');
const ip = require('ip');

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

/* the instance of QMP
 * vm uuid to QMP
 */
let __qmps = {};

class Manager
{
    constructor() {
        this.categoryList = null;
        this.loadConfiguration();
    }

    loadConfiguration() {
        console.log("load configuration");

        try {
            let obj = __configuration.unserialize(CONF.VIRM_CONF_PATH);

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
        __configuration.serialize(CONF.VIRM_CONF_PATH);
    }

    create(category, options) {
        switch(category.toLowerCase()) {
            case "vm":
                return this.createVM(options.name);
            case "disk":
                return this.createDisk(
                        options.path,
                        options.size);
            case "pci":
                return this.createPCIDevice(
                        options.busnum);
            case "net":
                return this.createNetworkDevice();
            case "route":
                return this.createRouteDevice(
                        options.net,
                        options.mask,
                        options.gw,
                        options.uuid);
            /* no category list type */
            case "agent":
                return this.createAgent(options.uuid);
            case 'damain':
                return createDAMain(this, options.addresses);
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

        return vm;
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
            return hd;
        }
        return null;
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
                return device;
            }
        }

        category.push(pcidev);
        this.saveConfiguration();

        return pcidev;
    }

    createNetworkDevice(ip, mask) {
        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == 'NET'
        });

        let netdev= new NetworkDevice(new TapDevice());
        if(ip !== undefined)
            netdev.ip = ip;
        if(mask !== undefined)
            netdev.mask = mask;

        console.log(netdev);

        category.push(netdev);
        this.saveConfiguration();

        return netdev;
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

        return route;
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

        return category.list;
    }

    findDevice(categoryName, uuid, name) {
        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == categoryName.toUpperCase();
        });

        let device = null;

        if(uuid !== undefined) {
            for(let key in category.list) {
                if(key == uuid)
                    device = category.list[key];
            }
        } else if(name !== undefined) {
            for(let key in category.list) {
                if(category.list[key].hasOwnProperty('name')) {
                    if(category.list[key]['name'] == name)
                        device = category.list[key];
                }
            }
        }

        if(!device)
            return null;

        Object.setPrototypeOf(device,
                PROTOTYPE_MAP[categoryName.toUpperCase()]);
        device.__prototype__ =
            PROTOTYPE_MAP[categoryName.toUpperCase()];

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
                try {
                    startupDAMain(this, uuid);
                } catch(err) {
                    console.log(err);
                }
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
                stopDAMain(this, uuid);
                break;
            default:
                console.log("Not support " + categoryName + " creation.");
                break;
        }
    }

    qmp(uuid, command) {
        let vm = this.findDevice('vm', uuid);
        if(!vm)
            return;

        this.createQMP(vm.uuid).then((qmp) => {
            qmp.execute(command, (obj) => { console.log(obj); });
        }).catch((err) => {
            console.log(err);
        });
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

    __createQMP(uuid, ev_handler) {
        return new Promise((resolve, reject) => {

            let vm = this.findDevice('vm', uuid);
            if(vm) {
                if(__qmps[vm.uuid] === undefined) {
                    __qmps[vm.uuid] = new QMP(vm);

                    let qmp = __qmps[vm.uuid];
                    qmp.setEncoding('utf8');

                    for(let ev in ev_handler) {
                        console.log('register ' + ev + ' handler');
                        qmp.on(ev, ev_handler[ev]);
                    }

                    delay(2000)('reconnect').then((result) => {
                        qmp.connect(vm.getMonitorSocketPath(), () => {
                            console.log('QMP connected');
                        });
                        qmp.once('ready', (cmds, evs) => {
                            resolve(__qmps[vm.uuid]);
                        });
                    });
                }
                else resolve(__qmps[vm.uuid]);
            }
            else reject(new Error('ENOENT'));
        });
    }

    createQMP(uuid, ev_handler) {
        return this.__createQMP(uuid, ev_handler);
    }

    /* DAMain code depcreated */
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
    /* END DAMain code */

    test(str) {

        let list = this.list('NET');

        console.log(list);
        let vm = new VirtualMachine('DAMain');
        let netdev= this.createNetworkDevice('192.168.61.2');
        let netdevs = vm.getDevices('NetworkDevice');
        console.log(netdevs);
        vm.addDevice(netdev);
        netdevs = vm.getDevices('NetworkDevice');
        console.log(netdevs);

        let dev = this.findDevice('vm', undefined, 'DAMain');
        console.log(dev);

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
