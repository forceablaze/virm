'use strict'

import Device from '../device';
import SubProcess from '../../process';

const fs = require('fs');
const { execSync } = require('child_process');

class PCIDevice extends Device
{
    constructor(busnum, deviceId = undefined) {
        super();

        if(busnum !== undefined) {
            this._busnum = busnum;
        }

        this.lookupDeviceId();
    }

    lookupDeviceId() {
        let deviceId = {};

        let lspci = new SubProcess('lspci', ['-n', '-s', this.busnum],
                (data) => {
                    console.log(data);
                }, (data) => {
                    console.log(data);
                });

        let stdoutList = lspci.runSync().stdout.split(' ');
        let deviceIds = stdoutList[2].split(':');

        this._classId = stdoutList[1].split(':')[0];
        this._deviceId = { 'vid': deviceIds[0], 'pid': deviceIds[1] };
    }

    start() {
    }

    bind(module) {
        if(module === undefined) {
            return;
        }

        let fullBusNum = "0000:" + this.busnum;
        let proc;
        try {
            proc = execSync('echo "' + fullBusNum + '" > /sys/bus/pci/drivers/' +
                    module + '/bind',
                    { encoding: 'utf8' });
        } catch(err) {
            if(err.status != 0) {
                console.log(err.status);
                console.log(err.toString());
            }
        }
    }

    unbind() {
        let fullBusNum = "0000:" + this.busnum;
        let proc;
        try {
            proc = execSync('echo "' + fullBusNum + '" > /sys/bus/pci/devices/' +
                    fullBusNum + '/driver/unbind',
                    { encoding: 'utf8' });
        } catch(err) {
            if(err.status != 0) {
                console.log(err.status);
                console.log(err.toString());
            }
        }
    }

    get busnum() {
        return this._busnum;
    }

    get classId() {
        return this._classId;
    }

    get vid() {
        return this._deviceId.vid;
    }

    get pid() {
        return this._deviceId.pid;
    }
}

export default PCIDevice;
