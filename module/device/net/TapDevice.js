'use strict'

import SubProcess from '../../process';
import NetworkDevice from './index';

class TapDevice extends NetworkDevice
{
    constructor() {
        super();
        this.name = this.uuid.substring(0, 15);
    }

    up() {
        super.up();

        let tunctl = new SubProcess('tunctl', ['-b', '-t', this.uuid]);
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

        super.down();
    }
}

export default TapDevice;
