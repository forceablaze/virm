'use strict'

import SubProcess from '../../process';
import Description from '../../desc';
import NetworkDevice from './index.js';
import Device from '../device';

class BridgeDevice extends Description
{
    constructor(name) {
        super();
        this._name = name;
        this._netdevs = {};
    }

    get name() {
        return this._name;
    }

    up() {
        let addbr = new SubProcess('brctl', ['addbr', this.name]);
        let result = addbr.runSync();
        console.log(result);

        let brup = new SubProcess('ifconfig', [this.name, 'up']);
        result = brup.runSync();
        console.log(result);
    }

    down() {
        let delbr = new SubProcess('brctl', ['delbr', this.name]);
        result = delbr.runSync();
        console.log(result);

        let brdown = new SubProcess('ifconfig', [this.name, 'down']);
        let result = brdown.runSync();
        console.log(result);
    }

    addif(netdev) {
        Object.setPrototypeOf(netdev, Device.prototype);
        if(netdev.type !== 'NetworkDevice')
            throw new Error('Wrong Type');

        Object.setPrototypeOf(netdev, NetworkDevice.prototype);

        let addif = new SubProcess('brctl', ['addif', this.name, netdev.name]);
        let result = addif.runSync();
        console.log(result);

        if(result.status != 0)
            throw new Error(result.stderr);
    }

    delif(netdev) {
        Object.setPrototypeOf(netdev, Device.prototype);
        if(netdev.type !== 'NetworkDevice')
            throw new Error('Wrong Type');

        Object.setPrototypeOf(netdev, NetworkDevice.prototype);

        let delif = new SubProcess('brctl', ['delif', this.name, netdev.name]);
        let result = delif.runSync();
        console.log(result);

        if(result.status != 0)
            throw new Error(result.stderr);
    }
}

export default BridgeDevice;
