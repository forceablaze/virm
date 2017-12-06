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

/* the device support prepare() and unprepare() */
const PROTOTYPE_MAP = {
    "HARDDISK": HardDisk.prototype,
    "PCIDEVICE": PCIDevice.prototype,
    "NETWORKDEVICE": NetworkDevice.prototype,
};

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
            '-cpu': 'host',
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

            /* qemu will not exit and a STOP event will eventually follow the SHUTDOWN event */
            argArray.push('-no-shutdown');

            /* qemu agent setting */
            argArray.push('-chardev');
            argArray.push('socket,path=/tmp/qdm.' +
                    this.uuid.substring(0, 8) + '.sock,server,nowait,id=qda0');

            argArray.push('-device');
            argArray.push('virtio-serial');

            /* monitor socket setting */
            argArray.push('-chardev');
            argArray.push('socket,id=chmon,path=' +
                    path.resolve(CONF.VIRM_RUN_PATH, `./${this.uuid}.mon`) + ',server,nowait');
            argArray.push('-mon');
            argArray.push('chardev=chmon,id=mon,mode=control');

            /* the chardev name must set to org.qemu.guest_agent.0 (agent default value) */
            argArray.push('-device');
            argArray.push('virtserialport,chardev=qda0,name=org.qemu.guest_agent.0');

            argArray.push('-device');
            argArray.push('nec-usb-xhci,id=usb,bus=pci.0');

            argArray.push('-device');
            argArray.push('virtio-balloon-pci,id=balloon0,bus=pci.0');

            /*
            argArray.push('-device');
            argArray.push('usb-tablet,id=input0');

            argArray.push('-global');
            argArray.push('PIIX4_PM.disable_s3=1');

            argArray.push('-global');
            argArray.push('PIIX4_PM.disable_s4=1');
            */


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
                    }).catch((err) => {
                        console.log(err);
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
                    }).catch((err) => {
                        reject(err);
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
        this._args['-smp'] = 'cores=' + core + ',threads=1,sockets=1';
    }

    setVNC(address, num) {
        this._args['-vnc'] = address + ":" + num;
    }

    getAgentSocketPath() {
        return '/tmp/qdm.' + this.uuid.substring(0, 8) + '.sock';
    }

    getMonitorSocketPath() {
        return path.resolve(CONF.VIRM_RUN_PATH, `./${this.uuid}.mon`);
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
        Object.values(this.devices).forEach((dev) => {
            Object.setPrototypeOf(dev, Device.prototype);
            dev.__prototype__ = PROTOTYPE_MAP[dev.type.toUpperCase()];
            dev.prepare(list);
        });
    }

    unprepareDevice() {
        Object.values(this.devices).forEach((dev) => {
            Object.setPrototypeOf(dev, Device.prototype);
            dev.__prototype__ = PROTOTYPE_MAP[dev.type.toUpperCase()];
            dev.unprepare();
        });
    }

    toString() {
        return this._args['-name'] + ":" + this._args['-uuid'];
    }
}

export default VirtualMachine;
