'use strict'

import Description from './index.js'

class DeviceDescription extends Description
{
    constructor(uuid) {
        super();
        this._uuid = uuid;
        this._type =
            Object.getPrototypeOf(this).constructor.name;
    }

    get uuid() {
        return this._uuid;
    }

    get type() {
        return this._type;
    }

    toString() {
        return this.uuid;
    }
}

export default DeviceDescription;
