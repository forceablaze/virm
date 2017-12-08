'use strict'

import CONF from '../../../conf';

import Device from '../device';
import SubProcess from '../../process';

const fs = require('fs');
const path = require('path');

class HardDisk extends Device
{
    constructor(path, size) {
        super();

        this._path = path;

        /* size in bytes */
        if(size !== undefined)
            this._size = size;
        else
            this._size = 1024;
    }

    isFileExisted() {
        return fs.existsSync(this.path);
    }

    createHardDisk() {

        if(this.isFileExisted()) {

            /* TODO check file is qcow2 or not */
            throw 'EEXIST';
        }
    
        let args = [
            'create',
            '-f', 'qcow2',
            `${this.path}`,
            `${this.size}`
        ];

        let process = new SubProcess(CONF.BIN_PATH + '/qemu-img', args);
        process.run();
    }

    get path() {
        return this._path;
    }

    get size() {
        return this._size;
    }

    prepare(...args) {
        args[0].push("-drive");
        args[0].push("file=" + path.resolve(this.path) + ",if=virtio");
    }

    unprepare() {
    }
}

export default HardDisk;
