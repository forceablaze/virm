'use strict'

import Device from '../device';
import SubProcess from '../../process';

const fs = require('fs');

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

        let process = new SubProcess('qemu-img', args);
        process.run();
    }

    get path() {
        return this._path;
    }

    get size() {
        return this._size;
    }
}

export default HardDisk;
