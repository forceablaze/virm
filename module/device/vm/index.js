'use strict'

import Device from '../device';
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
        this.qemuProcess = null;
    }

    createInstance() {
        let argArray = [];
        for(let key in this._args) {
            console.log("key: " + key + "value: " + this._args[key]);
            argArray.push(key);
            argArray.push(this._args[key]);
        }

        this.qemuProcess = new SubProcess('qemu-system-x86_64', argArray);
        this.qemuProcess.run();

        return this.qemuProcess;
    }

    start() {
        let instance = super.start();

        if(instance) {
            throw 'started';
        }

        this.createInstance();

        return this;
    }

    destroy() {
        try {
            if(this.qemuProcess)
                this.qemuProcess.interrupt();
        } catch(e) {
            throw e;
        }
        this.qemuProcess = null;
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

    addHardDisk() {
    }

    addPCIDevice() {
    }

    toString() {
        return this._args['-name'] + ":" + this._args['-uuid'];
    }
}

export default VirtualMachine;
