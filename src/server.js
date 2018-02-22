'use strict'

import Manager from './manager';
import SubProcess from './module/process';
import CONF from './conf';

import { CMD, SYNC_BYTE, END_BYTE, Res} from './reqres';
import { cidrize, getRandomIntInclusive } from './utils';

const AsyncLock = require('async-lock');
const fs = require('fs');
const net = require('net');

const events = require('events');
const manager = Manager.getInstance();
const VIRM_PID_PATH = CONF.INSTALL_PATH + '/var/run/virm.pid';

let pidFile = fs.createWriteStream(VIRM_PID_PATH);
pidFile.write(process.pid.toString());
pidFile.end();

let exitProcess = () => {
    fs.unlinkSync(VIRM_PID_PATH);
    process.exit(0);
};
process.on('SIGINT', exitProcess);

/* buffer handler */
const inBuffer = [];
const lock = new AsyncLock();
const emitter = new events.EventEmitter(); 

emitter.on('exec', (client, obj) => {
    console.log(obj);

    let resBuilder = new Res.ResBuilder();
    let data = {};
    let async = false;

    switch(obj['cmd']) {
        case CMD.QMP.toString():
        case CMD.AGENT.toString():
          async = true;
    }

    switch(obj['cmd']) {
        case CMD.QMP.toString():
            manager.qmp(
                    obj['options']['uuid'],
                    obj['options']['qmp_command']);
            break;
        case CMD.AGENT.toString():
            manager.agent(
                    obj['options']['uuid'],
                    obj['options']['agent_command']).then((value) => {
                resBuilder.setData(JSON.stringify(value));
                emitter.emit('response', client,
                    resBuilder.build().toBuffer());
            }).catch((err) => {
                console.log(err);
            });
            break;
    }

    if(async)
        return;

    switch(obj['cmd']) {
        case CMD.CREATE.toString():
            manager.create(obj['category'], obj['options']);
            break;
        case CMD.START.toString():
            manager.start(obj['category'], obj['options']['uuid']);
            break;
        case CMD.STOP.toString():
            manager.stop(
                    obj['category'], obj['options']['uuid']);
            break;
        case CMD.LIST.toString(): {
            let array = [];
            let list = manager.list(obj['category']);
            for(let key in list) {
                array.push(list[key].uuid);
            }
            data[obj['category']] = array;
        }
            break;
        case CMD.FIND.toString():
            let dev = manager.findDevice(obj['category'],
                    obj['options']['uuid'], obj['options']['name']);
            if(dev)
                data = dev.uuid;
            break;
        default:
            console.log('not support cmd ' + obj['cmd']);
            break;
    }

    resBuilder.setData(data);
    emitter.emit('response', client,
            resBuilder.build().toBuffer());
});

emitter.on('sync', (chunk, i) => {
    console.log('get a request');
});

emitter.on('end', (chunk, i, client) => {
    const buf = Buffer.from(inBuffer);

    lock.acquire('key', (done) => {
        /* clear buffer */
        inBuffer.splice(0, inBuffer.length);
        done();

        emitter.emit('exec', client, JSON.parse(buf.toString('utf8')));
    });
});

emitter.on('response', (client, buf) => {
    client.write(buf);
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
                        emitter.emit('end', chunk, i, client);
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
