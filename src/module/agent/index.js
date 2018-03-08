'use strict'

const net = require('net');
import VirtualMachine from '../device/vm';

class Agent {

    constructor(vmdev) {
        this._vmdev = vmdev;
    }

    createSocket() {
        return new Promise((resolve, reject) => {
            let client = new net.Socket();
            client.setEncoding('utf8');

            /* if this socket do any task, destory*/
            client.setTimeout(1000);
            client.on('timeout', () => {
                client.end();
                client.destroy();
                reject(new Error('ETIMEOUT'));
            });

            let cb = () => {
                resolve(client);
            };

            let errorListener = (err) => {
                if(err.code === 'ENOENT') {
                    let promise = new Promise((resolve, reject) => {
                            setTimeout(() => {
                                resolve('reconnect');
                            }, 3000)
                        }
                    );

                    promise.then((value) => {
                        client.once('error', errorListener);
                        console.log('reconnect to agent');
                        client.connect(this.vmdev.getAgentSocketPath(), cb);
                    })
                    .catch((err) => {
                        console.log('create socket error');
                        console.log(err);
                    })
                }
                else {
                    reject(err);
                }
            };
            client.once('error', errorListener);
            client.connect(this.vmdev.getAgentSocketPath(), cb);
        });
    }

    sendAgentRequest(req) {
        return new Promise((resolve, reject) => {

            this.createSocket()
            .then((client) => {
                client.on('data', (data) => {
                    try {
                        let obj = JSON.parse(data);
                        resolve(obj);
                        client.destroy();
                    } catch(err) {
                        reject(err);
                    }
                });

                console.log('agent request:', req);
                client.write(req);

                setTimeout(() => {
                    client.destroy();
                    reject(new Error('ETIMEOUT'));
                }, 10000);
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    getAgentVersion() {
        return new Promise((resolve, reject) => {
            this.sendAgentRequest('{"execute": "guest-info"}')
            .then((obj) => {
                resolve(obj['return']['version']);
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    getNICAddress(name) {
        return (type) => {
            return new Promise((resolve, reject) => {
                this.getNetworkInterfacebyDeviceName(name)
                .then((nic) => {
                    if(nic['ip-addresses'] === undefined) {
                        reject(new Error('EAGAIN'));
                        return;
                    }
                    nic['ip-addresses'].forEach((item) => {
                        if(item['ip-address'] !== undefined &&
                            item['ip-address-type'] === type) {
                            resolve(item['ip-address'] + '/' + item['prefix'].toString());
                            return;
                        }
                    });
                })
                .catch((err) => {
                    reject(err);
                });
            });
        }
    };

    getNetworkInterfaces() {
        return new Promise((resolve, reject) => {
            this.sendAgentRequest('{"execute": "guest-network-get-interfaces"}')
            .then((obj) => {
                resolve(obj['return']);
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    /* get all fo the network interface of the guest */
    getNetworkInterfacebyDeviceName(name) {
        return new Promise((resolve, reject) => {
            this.getNetworkInterfaces()
            .then((obj) => {
                obj.forEach((item) => {
                    if(item.name === name) {
                        resolve(item);
                    }
                });
            })
            .catch((err) => { reject(err) });
        });
    }

    getGuestTime() {
        return new Promise((resolve, reject) => {
            this.sendAgentRequest('{"execute": "guest-get-time"}')
            .then((obj) => {
                resolve(obj['return']);
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    setGuestTime(nanoSeconds) {
        return new Promise((resolve, reject) => {
            this.sendAgentRequest(
                '{"execute": "guest-set-time",' +
                '"arguments": {"time": ' + nanoSeconds + '}}')
            .then((obj) => {
                resolve(obj['return']);
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    execute(command, argument) {
        return new Promise((resolve, reject) => {
            let cmd;
            if(argument !== undefined)
              cmd = '{"execute": "' + command + '", "arguments": ' + argument + '}';
            else
              cmd = '{"execute": "' + command + '"}';

            this.sendAgentRequest(cmd)
            .then((obj) => {
                resolve(obj['return']);
            })
            .catch((err) => {
                reject(err);
            });
        });
    }

    /* write <command> to /tmp/task.sh */
    sendTask(command, result) {
        return new Promise((resolve, reject) => {
            this.sendAgentRequest(
                '{"execute": "guest-file-open",' +
                '"arguments": {"path": "/tmp/task.sh", "mode": "w+"}}')
            .then((obj) => {
                let handle = obj['return'];

                this.sendAgentRequest(
                    '{"execute": "guest-file-write",' +
                    '"arguments": {"handle": ' + handle +
                    ', "buf-b64": "' + new Buffer(command).toString('base64') + '"}}')
                .then((obj) => {
                    console.log('command length: ' + command.length);

                    if(command.length != obj['return']['count']) {
                        reject(new Error('EIO'));
                    }

                    this.sendAgentRequest(
                        '{"execute": "guest-file-close",' +
                        '"arguments": {"handle": ' + handle + '}}')
                    .then((obj) => {
                        resolve(result);
                    }).catch((err) => { reject(err) });
                }).catch((err) => { reject(err) });
            }).catch((err) => { reject(err) });
        });
    }

    get vmdev () {
        return this._vmdev;
    }
}

export default Agent;
