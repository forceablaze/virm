'use strict'

import CONF from '../../../conf';

import SubProcess from '../../process';

import Device from '../device';
import HardDisk from '../disk';
import PCIDevice from '../pci';
import NetworkDevice from '../net';

import VFIODevice from '../pci/VFIODevice';

import { delay } from '../../../utils';

const portfinder = require('portfinder');
const path = require('path');
const fs = require('fs');

/* VNC base port */
portfinder.basePort = 5900;

class VirtualMachine extends Device
{
    constructor(name) {
        super();
        this._args = {
            '-name': name,
            '-uuid': `${this.uuid}`,
            '-machine': 'pc-i440fx-2.3,accel=kvm,usb=off',
            '-cpu': 'Nehalem',
            /* boot from disk */
            '-boot': 'c,strict=on'
        };
    }

    createInstance() {
        return new Promise((resolve, reject) => {

            let argArray = [];
            for(let key in this._args) {
                console.log("key: " + key + " value: " + this._args[key]);
                argArray.push(key);
                argArray.push(this._args[key]);
            }

            /* qemu agent setting */
            argArray.push('-chardev');
            argArray.push('socket,path=/tmp/qdm.' +
                    this.uuid.substring(0, 8) + '.sock,server,nowait,id=qda0');

            argArray.push('-device');
            argArray.push('virtio-serial');

            /* the chardev name must set to org.qemu.guest_agent.0 (agent default value) */
            argArray.push('-device');
            argArray.push('virtserialport,chardev=qda0,name=org.qemu.guest_agent.0');

            /* generate the arguments */
            this.prepareDevice(argArray);

            /* set the VNC */
            if(this._args['-vnc'] === undefined) {
                portfinder.getPortPromise()
                    .then((port) => {
                        let index = port - 5900;
                        argArray.push('-vnc');
                        argArray.push(':' + index.toString());

                        this.__createInstance(argArray)
                            .then((instance) => {
                                resolve(instance);
                            });
                    })
                    .catch((err) => {
                        reject(new Error('EADDRINUSE'));
                    });
            } else {
                this.__createInstance(argArray)
                    .then((instance) => {
                        resolve(instance);
                    });
            }
        });
    }

    __createInstance(args) {
        return new Promise((resolve, reject) => {
            this.instance = new SubProcess(CONF.BIN_PATH + '/qemu-system-x86_64', args,
                (data) => {
                    console.log(data);
                }, (data) => {
                    console.log(data);
                });
            this.instance.run();

            resolve(this.instance);
        });
    }

    start() {
        if(this.instance) {
            throw 'Device already started.';
        }

        return new Promise((resolve) => {
            try {
                this.createInstance()
                    .then((instance) => {
                        resolve(instance);
                    });
            } catch(err) {
                resolve(err);
            }
        });
    }

    stop() {
        try {
            if(this.instance)
                this.instance.interrupt();

            delay(500)('done').then((value) => {
                this.unprepareDevice();
            });
        } catch(e) {
            throw e;
        }
        this.instance = null;
    }

    setMemory(size) {
        this._args['-m'] = size;
    }

    setCPUCore(core) {
        this._args['-smp'] = core;
    }

    setVNC(address, num) {
        this._args['-vnc'] = address + ":" + num;
    }

    getAgentSocketPath() {
        return '/tmp/qdm.' + this.uuid.substring(0, 8) + '.sock';
    }

    addDevice(device) {
        let proto = Object.getPrototypeOf(device);

        super.addDevice(device);
    }

    addHardDisk(disk) {
    }

    addPCIDevice() {
    }

    prepareDevice(list) {
        for(let key in this.devices) {
            let dev = this.devices[key];
            Object.setPrototypeOf(dev, Device.prototype);

            switch(dev.type) {
                case "HardDisk":
                    this.prepareHardDisk(dev, list);
                    break;
                case "PCIDevice":
                    this.preparePCIDevice(dev, list);
                    break;
                case "NetworkDevice":
                    this.prepareNetworkDevice(dev, list);
                    break;
                default:
                    console.log("Not supported device type: " + dev.type);
            }
        }
    }

    unprepareDevice() {
        for(let key in this.devices) {
            let dev = this.devices[key];
            Object.setPrototypeOf(dev, Device.prototype);

            switch(dev.type) {
                case "NetworkDevice":
                    this.unprepareNetworkDevice(dev);
                    break;
                case "PCIDevice":
                    this.unpreparePCIDevice(dev);
                    break;
                default:
                    console.log("Not supported device type: " + dev.type);
            }
        }
    }

    prepareHardDisk(disk, list) {
        Object.setPrototypeOf(disk, HardDisk.prototype);

        list.push("-drive");
        list.push("file=" + path.resolve(disk.path) + ",if=virtio");
    }

    preparePCIDevice(pcidev, list) {
        Object.setPrototypeOf(pcidev, PCIDevice.prototype);
        let vfio = new VFIODevice(pcidev);
        vfio.bind();

        list.push("-device");
        list.push("vfio-pci,host=" + pcidev.busnum);
    }

    prepareNetworkDevice(netdev, list) {
        Object.setPrototypeOf(netdev, NetworkDevice.prototype);
        list.push("-netdev");
        list.push("type=tap,id=net0,ifname=" + netdev.name + ",script=no,downscript=no");
        list.push("-device");
        list.push("virtio-net-pci,netdev=net0,mac=" + netdev.mac);

        netdev.up();
    }

    unprepareNetworkDevice(netdev) {
        Object.setPrototypeOf(netdev, NetworkDevice.prototype);
        netdev.down();
    }

    unpreparePCIDevice(pcidev) {
        Object.setPrototypeOf(netdev, PCIDevice.prototype);
        pcidev.unbind();
    }

    toString() {
        return this._args['-name'] + ":" + this._args['-uuid'];
    }
}

export default VirtualMachine;
