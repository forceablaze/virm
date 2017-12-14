'use strict'

import Device from '../device';
import SubProcess from '../../process';
import VFIODevice from './VFIODevice.js';
import CONF from '../../../conf';

const fs = require('fs');
const path = require('path');
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

        let lspci = new SubProcess(
                path.resolve(CONF.INSTALL_PATH, './usr/sbin/lspci'),
                ['-n', '-s', this.busnum],
                (data) => {
                    console.log(data);
                }, (data) => {
                    console.log(data);
                });

        let stdoutList = lspci.runSync().stdout.split(' ');
        let deviceIds = stdoutList[2].split(':');

        this._classId = stdoutList[1].split(':')[0];
        this._deviceId = { 'vid': deviceIds[0].trim(), 'pid': deviceIds[1].trim() };
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

    prepare(...args) {
        let vfio = new VFIODevice(this);
        vfio.bind();

        args[0].push("-device");
        args[0].push("vfio-pci,rombar=0,host=" + this.busnum);
    }

    unprepare() {
        this.unbind();
    }
}

export default PCIDevice;
