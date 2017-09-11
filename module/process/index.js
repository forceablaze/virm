'use strict'

const { spawn, spawnSync } = require('child_process');

class SubProcess
{
    constructor(path, args, stdoutStreamCallback = (data) => {},
            stderrStreamCallback = (data) => {})
    {
        this._path = path;
        this._args = args;
        this._stdoutStreamCallback = stdoutStreamCallback;
        this._stderrStreamCallback = stderrStreamCallback;
    }

    set args(args) {
        this._args = args;
    }

    get args() {
        return this._args;
    }

    get pid() {
        return this._pid;
    }

    run() {
        this.proc = spawn(this._path,
                this._args, {
                    /* default value */
                    stdio: ['pipe', 'pipe', 'pipe']
                });

        this.proc.stdout.setEncoding('utf8');
        this.proc.stdout.on('data', this._stdoutStreamCallback);
        this.proc.stderr.setEncoding('utf8');
        this.proc.stderr.on('data', this._stderrStreamCallback);
        this._pid = this.proc.pid;
    }

    runSync() {
        this.proc = spawnSync(this._path,
                this._args, {
                    /* default value */
                    stdio: ['pipe', 'pipe', 'pipe']
                });

        this._pid = this.proc.pid;

        return {
                'pid': this.pid,
                'stdout': this.proc.stdout.toString(),
                'stderr': this.proc.stdout.toString()
               };
    }


    interrupt() {
        try {
            this.proc.kill('SIGINT');
        } catch(e) {
            throw e;
        }
    }

    kill(sig) {
        try {
            this.proc.kill(sig);
        } catch(e) {
            throw e;
        }
    }
}

export default SubProcess;
