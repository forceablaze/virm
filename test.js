#!/usr/bin/env node

import CONF from './conf'
import SubProcess from './module/process';
import DeviceDescription from './module/desc/DeviceDescription'
import VirtualMachine from './module/device/vm'
import Configuration from './module/conf';
import Category from './manager/Category';
import { delay } from './utils';
import QMP from './module/qmp';

import NetworkDevice from './module/device/net';
import HardDisk from './module/device//disk';
import TapDevice from './module/device/net/TapDevice.js';
import BridgeDevice from './module/device/net/BridgeDevice.js';

const fs = require('fs');
const network = require('network');
console.log(CONF);

let vm = new VirtualMachine('New VM', (data) => {console.log(data)});
vm.setCPUCore(2);
vm.setMemory(512);
vm.addDevice(new HardDisk(CONF.IMAGE_PATH + '/test.qcow2'));

let netdev= new NetworkDevice(new TapDevice());
vm.addDevice(netdev);

network.get_interfaces_list((err, list) => {
    console.log(list);
});


try {
    vm.start();
} catch(e) {
    console.log(e);
}

let br = new BridgeDevice('br0');
br.addif(netdev);

let p1 = new Promise((resolve, reject) => {
        setTimeout(function() {
            resolve("Success");
            vm.stop();

        }, 600000)
    }
)

let category = new Category('VM', VirtualMachine);
console.log(category);
console.log(VirtualMachine.name);

process.on('SIGINT', () => {
    vm.stop();
});

let qmp = new QMP();
qmp.setEncoding('utf8');

delay(3000)('done').then((value) => {
    qmp.connect(vm.getMonitorSocketPath(), () => {
        console.log('connected');
    });
});

qmp.on('vnc_connected', (ev) => {
    console.log(ev);
});

qmp.on('powerdown', (ev) => {
    console.log(ev);
});

qmp.on('shutdown', (ev) => {
    console.log(ev);
});

qmp.on('stop', (ev) => {
    console.log(ev);
});

qmp.on('ready', (cmds, evs) => {
    console.log(cmds);
    console.log(evs);

    delay(3000000)('done').then((value) => {
//        qmp.powerdown();
    });
});
