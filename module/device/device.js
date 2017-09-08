'use-strict'

import DeviceDescription from '../desc/DeviceDescription'

const uuidv4 = require('uuid/v4');

class Device extends DeviceDescription
{
    constructor() {
        super(uuidv4());
        this.instance = null;
    }

    /* create an instance. */
    start() {
    }

    /* destroy the instance. */
    destroy() {
    }
}

export default Device
