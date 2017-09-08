'use-strict'

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
        console.log(Object.getPrototypeOf(device).constructor.name);
        Object.setPrototypeOf(device, Device.prototype);
        this.devices[device.uuid] = device;
    }

    /* create an instance. */
    start() {
    }

    /* destroy the instance. */
    destroy() {
    }
}

export default Device
