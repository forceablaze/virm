'use strict'

import Description from './index.js'

class DeviceDescription extends Description
{
    constructor(uuid) {
        super();
        this._uuid = uuid;
    }

    get uuid() {
        return this._uuid;
    }

    toString() {
        return this.uuid;
    }
}

export default DeviceDescription;
