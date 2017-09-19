#!/usr/bin/env node

import CONF from './conf'
import SubProcess from './module/process';
import DeviceDescription from './module/desc/DeviceDescription'
import VirtualMachine from './module/device/vm'
import Configuration from './module/conf';
import Category from './manager/Category';

const fs = require('fs');

console.log(CONF);

let vm = new VirtualMachine('New VM', (data) => {console.log(data)});

vm.setCPUCore(2);
vm.setMemory(2048);


try {
    vm.start();
//    vm.serialize();
} catch(e) {
    console.log(e);
}
let p1 = new Promise((resolve, reject) => {
        setTimeout(function() {
            resolve("Success");
            vm.stop();

        }, 3000)
    }
)

let array = [];
let object = {};

object['array'] = array;
console.log(object['array'].__proto__);
let category = new Category('VM', VirtualMachine);
console.log(category);
console.log(VirtualMachine.name);

console.log(JSON.stringify(category, null, 2));

function isTrue() {
    return false;
}

if(isTrue()) {
    console.log("TRUE");
}

var intervalID = 0;

var wait = 
    ms => new Promise(
        r => setTimeout(r, ms)
    );

var repeat = 
    (ms, func) => new Promise(
        r => (
            intervalID = setInterval(func, ms), 
            wait(ms).then(r)
        )
    );

var myfunction = 
    () => new Promise(
        r => r(console.log('repeating...'))
    );

var stopAfter5Secs = 
    () => new Promise(
        r => r(setTimeout(() => { 
                    clearInterval(intervalID);
                    console.log('repeat end') 
               } , 5000))
    );

repeat(1000, () => Promise.all([myfunction()])) // 1000 miliseconds = 1 second
.then(stopAfter5Secs())  // starts timer to end repetitions
.then(console.log('repeat start')); // informs that all actions were started correctly and we are waiting for them to finish

var t = 500;
var max = 5;

function rejectDelay(reason) {
	return new Promise(function(resolve, reject) {
		setTimeout(reject.bind(null, reason), t); 
	});
}

var p = Promise.reject();
for(var i=0; i<max; i++) {
	p = p.catch(attempt).catch(rejectDelay);
}
p = p.then(processResult).catch(errorHandler);


function attempt() {
	var rand = Math.random();
	if(rand > 0.5) {
		throw rand;
	} else {
		return rand;
	}
}
function processResult(res) {
	console.log(res);
}
function errorHandler(err) {
	console.error(err);
}
