'use strict'

import Serialization from './Serialization'

class Configuration extends Serialization
{
    constructor() {
        super();
        this._configuries = {};
    }

    push(key, value) {
        let propertyName = key;
        this._configuries[propertyName] = value;
    }

    get(key) {
        return this._configuries[key];
    }

    get configuries() {
        return this._configuries;
    }

    importConfiguration(obj) {
        /* push each object */
        for(let key in obj._configuries) {
            this.push(key, obj._configuries[key]);
        }
    }

    test(obj) {
        console.log(obj._configuries);
    }
}

export default Configuration;
