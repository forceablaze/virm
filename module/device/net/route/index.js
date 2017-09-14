'use strict'

import Device from '../../device';
import NetworkDevice from '../index.js';

import SubProcess from '../../../process';

class RouteDevice extends Device
{
    constructor(net, mask, gateway = undefined, netdev) {
        super();

        this._net = net;
        this._mask = mask;
        this._gateway = gateway;
        this._netdev = netdev;
    }

    get net() {
        return this._net;
    }

    get mask() {
        return this._mask;
    }

    get gateway() {
        return this._gateway;
    }

    start() {
        this.up();
    }

    stop() {
        this.down();
    }

    up() {
        let args =
                [   'add', '-net', this.net,
                    'netmask', this.mask
                ];

        if(this.gateway !== undefined) {
            args.push('gateway');
            args.push(this.gateway);
        }
        args.push('dev');
        args.push(this.netdev.name);

        let route = new SubProcess('route', args);
        let result = route.runSync();
        console.log(result);
    }

    down() {
        let args =
                [   'del', '-net', this.net,
                    'netmask', this.mask
                ];

        if(this.gateway !== undefined) {
            args.push('gateway');
            args.push(this.gateway);
        }
        args.push('dev');
        args.push(this.netdev.name);

        let route = new SubProcess('route', args);
        let result = route.runSync();
        console.log(result);
    }

    get netdev() {
        Object.setPrototypeOf(this._netdev,
                NetworkDevice.prototype);
        return this._netdev;
    }
}

export default RouteDevice;
