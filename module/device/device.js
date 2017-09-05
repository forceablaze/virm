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
    create() {
        if(!this.instance) {
            this.instance = this;
        }
        return this.instance;
    }

    /* destroy the instance. */
    destroy() {
    }

    toString() {
        return this;
    }
}

export default Device
