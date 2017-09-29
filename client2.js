import CONF from './conf';

import { CMD, CATEGORY, Req, Res } from './reqres';

const net = require('net');
const readline = require('readline');
const options = require('options-parser');

let opts = null;
try {
    opts = options.parse({
        cmd: { default: 'help' },
        timeout: { default: 3000 }
    });
} catch(err) {
    process.exit(10);
}

const command = opts['opt']['cmd'];
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
    return reqBuilder
            .setCMD(CMD.STOP)
            .setCategory(CATEGORY.DAMAIN)
            .setUUID('23ec1916-8802-46c8-ac73-8b311ce7f0fd')
            .build();
};

let run = () => {
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
