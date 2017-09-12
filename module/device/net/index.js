'use strict'

const randomMac = require('random-mac');

import Device from '../device';

class NetworkDevice extends Device
{
    constructor() {
        super();
        this.mac = randomMac();
        this.ip = '0.0.0.0';
    }

    get mac() {
        return this._mac;
    }

    set mac(mac) {
        this._mac = mac;
    }

    get ip() {
        return this._ip;
    }

    set ip(ip) {
        this._ip = ip;
    }

    up() {
    }

    down() {
    }
}

export default NetworkDevice;
