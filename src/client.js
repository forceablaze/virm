import CONF from './conf';

import { CMD, CATEGORY, Req, Res } from './reqres';

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

        qmp: { default: 'query-status' }
    });
} catch(err) {
    process.exit(10);
}

const command = opts['opt']['cmd'];
const category = opts['opt']['category'];
const timeout = opts['opt']['timeout'];

/* a builder to generate request */
const reqBuilder = new Req.ReqBuilder();

const client = new net.Socket();
client.setEncoding('utf8');

process.on('SIGINT', () => {
    rl.close();
    client.destroy();
    process.exit(0);
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

    return reqBuilder.build();
};

client.on('error', (err) => {

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
