'use strict'

const net = require('net');
const readline = require('readline');

class QMP extends net.Socket {

    constructor() {
        super();
        this.cmds = [];
        this.evs = [];
    }

    connect(path, cb = () => { }) {
        this.on('error', (err) => {
            console.log(err);
        });

        super.connect(path, () => {
            this.readline = readline.createInterface( { input: this } );

            let listener = (line) => {
                try {
                    let obj = JSON.parse(line);
                    console.log(obj);
                    if(obj['event'] !== undefined) {
                        console.log(obj.event);
                        this.emit(obj.event.toLowerCase(), obj);
                    }
                } catch(err) {
                    console.log(err);
                }
            };

            let eventslistener = (line) => {
                let obj = JSON.parse(line);

                if(obj['return'] !== undefined) {
                    let _evs = obj['return'];
                    _evs.forEach((ev) => {
                        this.evs.push(ev['name']);
                    });
                }
                this.emit('ready', this.cmds, this.evs);
                this.readline.on('line', listener);
            };
           
            let cmdslistener = (line) => {
                let obj = JSON.parse(line);

                if(obj['return'] !== undefined) {
                    let _cmds = obj['return'];
                    _cmds.forEach((cmd) => {
                        this.cmds.push(cmd['name']);
                    });
                }

                this.readline.once('line', eventslistener);
                this.write('{"execute": "query-events"}');
            };

            let capslistener = (line) => {
                let obj = JSON.parse(line);

                this.readline.once('line', cmdslistener);
                this.write('{"execute": "query-commands"}');
            };

            let initlistener = (line) => {
                let obj = JSON.parse(line);

                if(obj['QMP'] !== undefined) {
                    let qemu = obj['QMP']['version']['qemu'];
                    console.log('qemu version: ' +
                            `${qemu['major']}.${qemu['minor']}.${qemu['micro']}`);
                }
                this.readline.once('line', capslistener);
                this.write('{"execute": "qmp_capabilities"}');
            };
            this.readline.once('line', initlistener);

            cb();
        });
    }

    execute(command) {
        this.write('{"execute": "' + command + '"}');
    }

    powerdown() {
        this.execute('system_powerdown');
    }
}

export default QMP;
