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

    /* run an instance. */
    start() {
    }

    /* stop the instance. */
    stop() {
    }
}

export default Device
