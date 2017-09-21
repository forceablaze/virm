const net = require('net');

import Agent from './module/agent';
import VirtualMachine from './module/device/vm';
import HardDisk from './module/device/disk';
import NetworkDevice from './module/device/net';
import TapDevice from './module/device/net/TapDevice';
import { delay } from './utils';


let vm = new VirtualMachine('New VM', (data) => {console.log(data)});
vm.setCPUCore(2);
vm.setMemory(512);
//vm.addDevice(new HardDisk('./test.qcow2'));

let netdev= new NetworkDevice(new TapDevice());
vm.addDevice(netdev);

const client = new Agent(vm);

try {
    vm.start();
} catch(e) {
    console.log(e);
}


let p1 = new Promise((resolve, reject) => {
        setTimeout(function() {
            resolve("Success");
            vm.stop();
        }, 6000000)
    }
)

let id = 1234;
let cb = () => {

    /*
    client.getNetworkInterfaces().then((value) => {
        console.log('value: ' + value);
    }).catch((err) => {
        console.log('error' + err);
    });

    client.getNetworkInterfacebyDeviceName('eth0')
        .then((item) => {
        console.log(item);
    }).catch((err) => {
    });
    client.sendTask('/sbin/ifconfig')
        .catch((err) => {
            if(err.errno === 'EAGAIN')
                console.log('Please try again');
        });
    */
}


    let repeat = () => {
        client.getAgentVersion().then((value) => {
            console.log('value: ' + value);
        }).catch((err) => {
            delay(2000)('reconnect').then((result) => {
                console.log(result);
                repeat();
            });
        });
    };

    repeat();


setInterval(cb, 10000);
