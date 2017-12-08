'use strict'

import Device from '../device';
import PCIDevice from './index';

const { execSync } = require('child_process');

class VFIODevice extends Device
{
    constructor(pcidev) {
        super();
        this.addDevice(pcidev);
    }

    addDevice(pcidev) {
        if(Object.keys(this.devices).length >= 1) {
            console.log("Already assign a PCIDevice.");
            return;
        }

        super.addDevice(pcidev);
    }

    get pcidev() {
        if(Object.keys(this.devices).length == 0) {
            throw 'No PCIDevice assigned.';
        }

        let pcidev = this.devices[Object.keys(this.devices)[0]];
        Object.setPrototypeOf(pcidev, PCIDevice.prototype);

        return pcidev;
    }

    bind() {
        this.unbind();

        let pcidev = this.pcidev;
        let proc;
        try {
            proc = execSync('echo "' + pcidev.vid + ' ' + pcidev.pid +
                    '" > /sys/bus/pci/drivers/vfio-pci/new_id',
                    { encoding: 'utf8' });
        } catch(err) {
            if(err.status != 0) {
                console.log(err.status);
                console.log(err.toString());
            }
        }
    }

    unbind() {
        this.pcidev.unbind();
    }
}

export default VFIODevice;
