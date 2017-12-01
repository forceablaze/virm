'use strict'

const Enum = require('enum');

const SYNC_BYTE = 0xFF;
const END_BYTE = 0xFE;

const CMD = new Enum(
        ['LIST', 'CREATE', 'START', 'STOP', 'ADD', 'QMP']);

const CATEGORY = new Enum(
        ['VM', 'NET', 'DISK', 'PCI', 'ROUTE', 'DAMAIN']);

class Req
{
    constructor(args) {
        for(let key in args) {
        }

        this._args = args;
    }

    toString() {
        return JSON.stringify(this._args);
    }

    toBuffer() {
        let buffer = new Uint8Array(this.toString().length + 2);
        buffer[0] = SYNC_BYTE;

        let str = this.toString();
        for(let i = 0; i < str.length; i++) {
            buffer[i + 1] = Number(str.charCodeAt(i));
        }
        
        buffer[buffer.length - 1] = END_BYTE;

        return new Buffer(buffer.buffer);
    }

    static get ReqBuilder() {
        return class ReqBuilder {
                constructor() {
                    this._attrs = { };
                    this._attrs['options'] = {};
                }

                setCMD(cmd) {
                    this._attrs['cmd'] = cmd;
                    return this;
                }

                setCategory(category) {
                    this._attrs['category'] = category;
                    return this;
                }

                setName(name) {
                    this._attrs['options']['name'] = name;
                    return this;
                }

                /* 01:00.0,02:00.0 */
                setPCIAddresses(addresses) {
                    this._attrs['options']['addresses'] = addresses;
                    return this;
                }

                setUUID(uuid) {
                    this._attrs['options']['uuid'] = uuid;
                    return this;
                }

                setQMPCommand(command) {
                    this._attrs['options']['qmp_command'] = command;
                    return this;
                }

                build() {
                    return new Req(this._attrs);
                }
            };
    }
}

class Res
{
}

export { SYNC_BYTE, END_BYTE, Req, Res, CMD, CATEGORY };
