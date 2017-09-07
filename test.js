#!/usr/bin/env node

import SubProcess from './module/process';
import DeviceDescription from './module/desc/DeviceDescription'
import VirtualMachine from './module/device/vm'
import Configuration from './module/conf';
import Category from './manager/Category';

const fs = require('fs');

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
/*
let p1 = new Promise((resolve, reject) => {
        setTimeout(function() {
            resolve("Success");
            vm.destroy();

        }, 1000)
    }
)
*/

vm.destroy();

let conf = new Configuration();
conf.push('a', vm);
conf.serialize("conf_test");

let obj = conf.unserialize("conf_test2");
console.log(obj);


let objString;
try {
    objString = fs.readFileSync("conf_test2", 'utf8').toString();
} catch(e) {
    console.log(e);
}

let conf2 = new Configuration();
console.log(Configuration.prototype);
console.log(conf2.__proto__);
console.log("imported");
conf2.importConfiguration(obj);
vm = conf2.get('a');
vm.__proto__ = VirtualMachine.prototype;

console.log(vm.uuid);


let array = [];

let object = {};

object['array'] = array;

console.log(object['array'].__proto__);

let category = new Category('VM', VirtualMachine);
console.log(category);
console.log(VirtualMachine.name);


console.log(JSON.stringify(category, null, 2));

console.log(Object.getPrototypeOf(conf));
