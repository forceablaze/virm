import CONF from './conf';

import { CMD, SYNC_BYTE, END_BYTE, CATEGORY, Req, Res } from './reqres';

const AsyncLock = require('async-lock');
const events = require('events');

const net = require('net');
const readline = require('readline');
const options = require('options-parser');

let opts = null;
try {
    opts = options.parse({
        cmd: { default: 'list', help: 'support list, create, start, stop, add, qmp' },
        category: { default: 'vm', help: 'the category of the command to do' },
        uuid: { help: 'device uuid' },
        name: { help: 'the name of the VM' },
        addresses: { help: 'the PCI addresses 01:00.0,02:00.0' },
        timeout: { default: 3000 },

        qmp: { default: 'query-status' },
        agent: { default: 'guest-network-get-interfaces' },
        argument: { default: undefined }
    });
} catch(err) {
    process.exit(10);
}

/* buffer handler */
const inBuffer = [];
const lock = new AsyncLock();
const emitter = new events.EventEmitter();

/* get the response from server */
emitter.on('sync', (chunk, i) => {
});

emitter.on('end', (chunk, i) => {
    const buf = Buffer.from(inBuffer);

    lock.acquire('key', (done) => {
        /* clear buffer */
        inBuffer.splice(0, inBuffer.length);
        done();
    });
    let data = JSON.parse(buf.toString('utf8'));
    console.log(data);
    process.emit('SIGINT', 0);
});

const command = opts['opt']['cmd'];
const category = opts['opt']['category'];
const timeout = opts['opt']['timeout'];

/* a builder to generate request */
const reqBuilder = new Req.ReqBuilder();

const client = new net.Socket();

process.on('SIGINT', (val) => {
    rl.close();
    client.destroy();
    process.exit(val);
});

/* parse each line */
const rl = readline.createInterface({
    input: client
});

rl.on('line', (line) => {
    console.log(line);
});

let generateReq = () => {

    reqBuilder
        .setCMD(CMD.get(command.toUpperCase()))
        .setCategory(CATEGORY.get(category.toUpperCase()));

    if(opts['opt']['uuid'] !== undefined)
        reqBuilder.setUUID(opts['opt']['uuid']);
    if(opts['opt']['name'] !== undefined)
        reqBuilder.setName(opts['opt']['name']);
    if(opts['opt']['addresses'] !== undefined)
        reqBuilder.setPCIAddresses(opts['opt']['addresses']);
    if(opts['opt']['qmp'] !== undefined)
        reqBuilder.setQMPCommand(opts['opt']['qmp']);
    if(opts['opt']['agent'] !== undefined)
        reqBuilder.setAgentCommand(opts['opt']['agent']);
    if(opts['opt']['argument'] !== undefined)
        reqBuilder.setArgument(opts['opt']['argument']);

    return reqBuilder.build();
};

client.on('error', (err) => {

});

client.on('data', (chunk) => {
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
});

client.connect(CONF.SOCKET_PATH, () => {
    client.write(generateReq().toBuffer());
});

new Promise((resolve, reject) => {
    setTimeout(() => {
        rl.close();
        client.destroy();
    }, timeout);
});
