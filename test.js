#!/usr/bin/env node

import SubProcess from './module/process';
import DeviceDescription from './module/desc/DeviceDescription'
import VirtualMachine from './module/device/vm'

let vm = new VirtualMachine('New VM');

vm.setCPUCore(2);
vm.setMemory(2048);
vm.setVNC("0.0.0.0", "0");
try {
    vm.create();
//    vm.serialize();
} catch(e) {
    console.log(e);
}

let p1 = new Promise((resolve, reject) => {
        setTimeout(function() {
            resolve("Success");
            vm.destroy();
        }, 10000)
    }
)
