'use strict'

import Serialization from '../conf/Serialization'

class Description extends Serialization
{
    constructor() {
        super();
        this._type =
            Object.getPrototypeOf(this).constructor.name;

        /* pointer to the <Class>.prototype Object */
        this.__prototype__ = this.__proto__;
    }

    get type() {
        return this._type;
    }
}

export default Description;
