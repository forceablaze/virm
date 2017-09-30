'use strict'

import Manager from './manager';
import SubProcess from './module/process';
import CONF from './conf';

import { CMD, SYNC_BYTE, END_BYTE } from './reqres';
const { cidrize, getRandomIntInclusive } = require('./utils');

const AsyncLock = require('async-lock');
const fs = require('fs');

/* for query ip address */
const network = require('network');
const cidrjs = require('cidr-js');
const ip = require('ip');
const net = require('net');

const events = require('events');

const manager = Manager.getInstance();

let pidFile = fs.createWriteStream(CONF.INSTALL_PATH + '/var/run/virm.pid');
pidFile.write(process.pid.toString());
pidFile.end();

let exitProcess = () => {
    fs.unlinkSync(CONF.INSTALL_PATH + '/var/run/virm.pid');
    process.exit(0);
};
process.on('SIGINT', exitProcess);

/* buffer handler */
const inBuffer = [];
const lock = new AsyncLock();
const emitter = new events.EventEmitter(); 

emitter.on('exec', (obj) => {
    console.log(obj);
    switch(obj['cmd']) {
        case CMD.CREATE.toString():
            manager.create(obj['category'], obj['options']);
            break;
        case CMD.START.toString():
            manager.start(obj['category'], obj['options']['uuid']);
            break;
        case CMD.STOP.toString():
            manager.stop(obj['category'], obj['options']['uuid']);
            break;
        case CMD.LIST.toString():
            manager.list(obj['category']);
            break;
        default:
            console.log('not support cmd ' + obj['cmd']);
            break;
    }
});

emitter.on('sync', (chunk, i) => {
    console.log('get a request');
});

emitter.on('end', (chunk, i) => {
    const buf = Buffer.from(inBuffer);

    lock.acquire('key', (done) => {
        /* clear buffer */
        inBuffer.splice(0, inBuffer.length);
        done();

        emitter.emit('exec', JSON.parse(buf.toString('utf8')));
    });
});

const unixServer = net.createServer(function(client) {
    console.log('client connected');

    client.on('readable', () => {
        let chunk;
        while (null !== (chunk = client.read())) {
            console.log(`Received ${chunk.length} bytes of data.`);
            for(let i = 0; i < chunk.length; i++) {
                switch(chunk[i]) {
                    case SYNC_BYTE:
                        emitter.emit('sync', chunk, i);
                        break;
                    case END_BYTE:
                        emitter.emit('end', chunk, i);
                        break;
                    default: {
                        lock.acquire('key', (done) => {
                            inBuffer.push(chunk[i]);
                            done();
                        });
                    }
                        break;
                }
            }
        }
    });

    client.on('end', () => {
        console.log('client disconnected');
    });

    client.on('error', (err) => {
        console.log(err);
        client.destroy();
    });
});

console.log(CONF.SOCKET_PATH);
unixServer.listen(CONF.SOCKET_PATH);
