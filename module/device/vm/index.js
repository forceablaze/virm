'use strict'

import SubProcess from '../../process';

import Device from '../device';
import HardDisk from '../disk';
import PCIDevice from '../pci';
import VFIODevice from '../pci/VFIODevice';

const path = require('path');
const fs = require('fs');

class VirtualMachine extends Device
{
    constructor(name) {
        super();
        this._args = {
            '-name': name,
            '-uuid': `${this.uuid}`,
            '-machine': 'pc-i440fx-2.3,accel=kvm,usb=off',
            '-cpu': 'Nehalem'
        };
    }

    createInstance() {
        let argArray = [];
        for(let key in this._args) {
            console.log("key: " + key + " value: " + this._args[key]);
            argArray.push(key);
            argArray.push(this._args[key]);
        }

        /* generate the arguments */
        this.prepareDevice(argArray);

        this.instance = new SubProcess('qemu-system-x86_64', argArray,
                (data) => {
                    console.log(data);
                }, (data) => {
                    console.log(data);
                });
        this.instance.run();
        console.log(this.instance.pid);

        return this.instance;
    }

    start() {
        if(this.instance) {
            throw 'Device already started.';
        }

        this.createInstance();

        return this;
    }

    destroy() {
        try {
            if(this.instance)
                this.instance.interrupt();
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

    addDevice(device) {
        let proto = Object.getPrototypeOf(device);

        switch(proto) {
            case HardDisk.prototype:
                this.addHardDisk(device);
                break;
            default:
                console.log(proto + " not support");
        }
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

    toString() {
        return this._args['-name'] + ":" + this._args['-uuid'];
    }
}

export default VirtualMachine;
