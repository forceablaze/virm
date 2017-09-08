'use strict'

import Category from './Category';
import Device from '../module/device/device'
import VirtualMachine from '../module/device/vm';
import Configuration from '../module/conf';

const CONF_PATH = 'virmanager.conf'

let __configuration = new Configuration();

const PROTOTYPE_MAP = {
    "VM": VirtualMachine.prototype
};

/* the instance of Manager */
let __instance = null;

class Manager
{
    constructor() {
        this.categoryList = null;
        this.loadConfiguration();
    }

    loadConfiguration() {
        console.log("load configuration");

        try {
            let obj = __configuration.unserialize(CONF_PATH);

            __configuration.importConfiguration(obj);

            this.categoryList = __configuration.get('categories');

            /* set the __proto__ of each element to Category */
            this.categoryList.forEach((element) => {
                Object.setPrototypeOf(element, Category.prototype);
            });

        } catch(e) {
            if(e.code == 'ENOENT') {
                console.log("configuration file not existed");
                this.initializeConfiguration();
                return;
            }
            console.log(e);
        }
    }

    initializeConfiguration() {
        try { [].undef () } catch (e) {
            console.log (e.stack.split ('\n')[1].split (/\s+/)[2]);
        }

        __configuration = new Configuration();

        /* VM list */
        this.categoryList = [];
        this.categoryList.push(new Category('VM', VirtualMachine)); 

        __configuration.push('categories', this.categoryList);
    }

    saveConfiguration() {
        __configuration.serialize(CONF_PATH);
    }

    createVM(name, cpu = 2, memory = 2048,
            vncAddress = "0.0.0.0",
            vncPort = "0") {

        let vm = new VirtualMachine(name);
        vm.setCPUCore(cpu);
        vm.setMemory(memory);
        vm.setVNC(vncAddress, vncPort);

        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == 'VM'
        });

        category.push(vm);
        this.saveConfiguration();
    }

    list(categoryName) {
        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == categoryName.toUpperCase();
        });
        for(let key in category.list) {
            Object.setPrototypeOf(category.list[key], Device.prototype);
            console.log(category.list[key].uuid);
        }
    }

    findDevice(categoryName, uuid) {
        /* get the category list */
        let category = this.categoryList.find((obj) => {
            return obj.name == categoryName.toUpperCase();
        });

        let device = null;
        for(let key in category.list) {
            if(key == uuid)
                device = category.list[key];
        }

        Object.setPrototypeOf(device,
                PROTOTYPE_MAP[categoryName.toUpperCase()]);

        return device;
    }

    start(categoryName, uuid) {
        let device = this.findDevice(categoryName, uuid);

        if(device) {
            console.log("start: " + device.toString());

            try {
                device.start();
            } catch(e) {
                console.log(e);
            }
        }
    }

    stop(categoryName, uuid) {
        let device = this.findDevice(categoryName, uuid);

        if(device) {
            console.log("destroy: " + device.toString());

            try {
                device.destroy();
            } catch(e) {
                console.log(e);
            }
        }
    }

    static getInstance() {
        if(!__instance) {
            __instance = new Manager();
        }
        return __instance;
    }
}

export default Manager;
