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
import { delay } from '../utils';

const CONF_PATH = 'virmanager.conf';

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

let __agents = {};

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

    start(categoryName, uuid) {
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

    stop(categoryName, uuid) {
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

    createAgent(uuid) {
        let vm = this.findDevice('vm', uuid);

        if(vm) {
            if(__agents[vm.uuid] === undefined)
                __agents[vm.uuid] = new Agent(vm);
            else
                console.log('agent already created');
        }
    }

    createDAMain() {
        let vm = new VirtualMachine('DAMain');

        let args = [
            'create',
            '-f', 'qcow2', '-b', CONF.IMAGE_PATH + '/damain-1.10',
            `${vm.uuid}`
        ];

        let createSnapshot = new SubProcess(CONF.BIN_PATH + '/qemu-img', args);
        let result = createSnapshot.runSync();
        console.log(result);

        vm.setCPUCore(2);
        vm.setMemory(512);
        vm.addDevice(new HardDisk(vm.uuid));

        let netdev= new NetworkDevice(new TapDevice());
        vm.addDevice(netdev);

        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == 'VM'
        });

        category.push(vm);
        this.saveConfiguration();
    }

    setVMNetworkInterface(client, uuid, ip) {
        return new Promise((resolve, reject) => {
            let vm = this.findDevice('vm', uuid);

            if(vm === undefined) {
                console.log('No VM found.');
                return;
            }

            if(vm.instance == null) {
                console.log('VM no running');
                return;
            }

            if(ip === undefined) {
                ip = '192.168.1.1';
            }


            let setNIC = () => {
                client.sendTask('/sbin/ifconfig eth0 ' + ip + ' netmask 255.255.255.0',
                        'done')
                .then((value) => {
                    if(value === 'done') {
                        console.log('send task success');
                        resolve('done');
                    }
                }).catch((err) => {
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
                    delay(2000)('reconnect').then((result) => {
                        sync();
                    });
                });
            };

            sync();
        });
    }

    startupDAMain(uuid, ip) {
        let vm = this.findDevice('vm', uuid);
        vm.start();

        let client = new Agent(vm);

        let getNICAddress = (type) => {
            return new Promise((resolve, reject) => {
                client.getNetworkInterfacebyDeviceName('eth0').then((nic) => {
                    if(nic['ip-addresses'] === undefined) {
                        reject(new Error('EAGAIN'));
                        return;
                    }
                    nic['ip-addresses'].forEach((item) => {
                        if(item['ip-address'] !== undefined &&
                           item['ip-address-type'] === type) {
                            resolve(item['ip-address']);
                            return;
                        }
                    });
                });
            });
        };

        let tryGetNICAddress = () => {
            getNICAddress('ipv4').then((ip) => {
                console.log('Get ip address: ' + ip);
            }).catch((err) => {
                delay(1000)('retry').then((result) => {
                    tryGetNICAddress();
                });
            });
        };

        /* setting NIC with client */
        this.setVMNetworkInterface(client, uuid, ip).then((value) => {
            tryGetNICAddress();
        });
    }

    test() {
        /*
        let pcidev = new PCIDevice("03:00.0");

        let vfiodev = new VFIODevice(pcidev);
        vfiodev.unbind();

        pcidev.bind('rtsx_pci');
        */
        let netdev= new NetworkDevice(new TapDevice());
        netdev.up();
        let route = new RouteDevice(
                '192.168.68.137',
                '255.255.255.255', undefined, netdev);
        route.up();
        route.down();

        netdev.down();
    }

    static getInstance() {
        if(!__instance) {
            __instance = new Manager();
        }
        return __instance;
    }
}

export default Manager;
