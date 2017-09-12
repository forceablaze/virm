'use strict'

import SubProcess from '../../process';
import Description from '../../desc';

const random_name = require('node-random-name');

class TapDevice extends Description
{
    constructor() {
        super();
        this._name = random_name({ first: true }).toLowerCase();
    }

    get name() {
        return this._name;
    }

    up() {
        let tunctl = new SubProcess('tunctl', ['-b', '-t', this.name]);
        let result = tunctl.runSync();
        console.log(result);


        let ifconf = new SubProcess('ifconfig', [this.name, 'up']);
        result = ifconf.runSync();
        console.log(result);
    }

    down() {
        let ifconf = new SubProcess('ifconfig', [this.name, 'down']);
        result = ifconf.runSync();
        console.log(result);

        let tunctl = new SubProcess('tunctl', ['-d', this.name]);
        let result = tunctl.runSync();
        console.log(result);
    }
}

export default TapDevice;
