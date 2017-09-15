#!/usr/bin/env node

'use strict'

import CONF from './conf';

const net = require('net');
const { spawn } = require('child_process');

const virmanager = spawn(CONF.BIN_PATH + '/npm', ['run', 'dev']);

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

    virmanager.stdout.on('data', (data) => {
        client.write(data);
    });

    client.on('end', () => {
        console.log('client disconnected');
    });
});

console.log(CONF.SOCKET_PATH);
unixServer.listen(CONF.SOCKET_PATH);
