'use strict'

import Device from '../device';
import HardDisk from '../disk';
import SubProcess from '../../process';

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
        this.driveArgsList = [];
    }

    createInstance() {
        let argArray = [];
        for(let key in this._args) {
            console.log("key: " + key + " value: " + this._args[key]);
            argArray.push(key);
            argArray.push(this._args[key]);
        }

        this.driveArgsList.forEach((args) => {
            console.log("-drive " + args);
            argArray.push("-drive " + args);
        });

        this.instance = new SubProcess('qemu-system-x86_64', argArray);
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
        this.driveArgsList.push(
                "file=" + disk.path + ",if=virtio");
    }

    addPCIDevice() {
    }

    toString() {
        return this._args['-name'] + ":" + this._args['-uuid'];
    }
}

export default VirtualMachine;
