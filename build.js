'use strict'

const TARGET = 'node6-linux-x64'

const { exec } = require('pkg')

exec([ 'build/server.min.js', '--target', TARGET, '--output', 'server' ]).then(() => {
    exec([ 'build/client.min.js', '--target', TARGET, '--output', 'client' ]).then(() => {
        exec([ 'build/virm.min.js', '--target', TARGET, '--output', 'virm-cli' ])
    });
});
