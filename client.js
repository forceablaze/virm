import CONF from './conf';

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
    if(line.substr(10, 11) === 'virmanager:') {
    }
    else console.log(line);
});

let run = () => {
    client.write(command + '\n');
};

client.connect(CONF.SOCKET_PATH, () => {
    run();
});

new Promise((resolve, reject) => {
    setTimeout(() => {
        rl.close();
        client.destroy();
    }, timeout);
});
