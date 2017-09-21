#!/usr/bin/env node

'use strict'

import CONF from './conf';

const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

let pidFile = fs.createWriteStream(CONF.INSTALL_PATH + '/var/run/virm.pid');
pidFile.write(process.pid.toString());
pidFile.end();

process.on('SIGINT', () => {
    fs.unlinkSync(CONF.INSTALL_PATH + '/var/run/virm.pid');
    process.exit(0);
});

const log = fs.createWriteStream(CONF.LOG_PATH + '/virmanager.log');
const virmanager = spawn(CONF.BIN_PATH + '/npm', ['run', 'virm']);

const unixServer = net.createServer(function(client) {
    console.log('client connected');

    client.on('data', (data) => {

        /* filter exit command */
        if(data.toString().trim() === 'exit') {
            return;
        }

        if(data.toString().trim() === 'stop server') {
            console.log('stop server from client command');
            process.exit();
            return;
        }

        virmanager.stdin.write(data);
    });

    let dataListerer = (data) => {
        client.write(data);
    }
    virmanager.stdout.pipe(log);
    virmanager.stdout.on('data', dataListerer);

    client.on('end', () => {
        console.log('client disconnected');
        virmanager.stdout.removeListener('data', dataListerer);
    });

    client.on('error', (err) => {
        console.log(err);
        client.destroy();
    });
});

console.log(CONF.SOCKET_PATH);
unixServer.listen(CONF.SOCKET_PATH);
