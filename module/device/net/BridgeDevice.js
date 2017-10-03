'use strict'

import SubProcess from '../../process';
import Description from '../../desc';
import NetworkDevice from './index.js';

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
        console.log(Object.getPrototypeOf(netdev));
        if(Object.getPrototypeOf(netdev) !== NetworkDevice.prototype)
            throw new Error('Wrong Type');

        console.log(netdev);

        let addif = new SubProcess('brctl', ['addif', this.name, netdev.name]);
        let result = addif.runSync();
        console.log(result);

        if(result.status != 0)
            throw new Error(result.stderr);
    }

    delif(netdev) {
        if(Object.getPrototypeOf(netdev) !== NetworkDevice.prototype)
            throw new Error('Wrong Type');

        let delif = new SubProcess('brctl', ['delif', this.name, netdev.name]);
        let result = delif.runSync();
        console.log(result);

        if(result.status != 0)
            throw new Error(result.stderr);

    }
}

export default BridgeDevice;
