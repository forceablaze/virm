'use strict'

import Category from './Category';

import VirtualMachine from '../module/device/vm';

let __instance = null;

class Manager
{
    constructor() {
        this.initializeDeviceList();
    }

    initializeDeviceList() {
        try { [].undef () } catch (e) {
            console.log (e.stack.split ('\n')[1].split (/\s+/)[2]);
        }

        this.categoryList = [];
        this.categoryList.push(new Category('VM', VirtualMachine)); 

        let category = this.categoryList.find((obj) => {
            return obj.name == 'VM'
        });

        console.log(category);
    }

    createVM() {

    }

    static getInstance() {
        if(!__instance) {
            __instance = new Manager();
        }
        return __instance;
    }
}

export default Manager;
