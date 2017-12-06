'use strict'

import DeviceDescription from '../desc/DeviceDescription'

const uuidv4 = require('uuid/v4');

class Device extends DeviceDescription
{
    constructor() {
        super(uuidv4());
        this.instance = null;
        this.devices = {};
    }

    addDevice(device) {
        console.log("addDevice " + Object.getPrototypeOf(device).constructor.name);
        Object.setPrototypeOf(device, Device.prototype);
        this.devices[device.uuid] = device;
    }

    getDevices(type) {
        let devs = [];

        for(let key in this.devices) {
            let dev = this.devices[key];
            Object.setPrototypeOf(dev, Device.prototype);

            if(type === dev.type) {
                devs.push(dev);
            }
        }
        return devs;
    }

    /* run an instance. */
    start() {
    }

    /* stop the instance. */
    stop() {
    }

    /* prepare device before starting qemu */
    prepare(...args) {
        this.castThenDo(() => {
            this.prepare(...args);
        });
    }

    /* unprepare device after stopping qemu*/
    unprepare() {
        this.castThenDo(() => {
            this.unprepare();
        });
    }

    castThenDo(cb = () => {}) {
        /* cast to the subclass that first create */
        if(this.hasOwnProperty('__prototype__')) {
            if(this.__prototype__ !== undefined) {
                Object.setPrototypeOf(this, this.__prototype__);
                cb();
            }
        }
    }
}

export default Device
