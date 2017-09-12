'use strict'

import Serialization from '../conf/Serialization'

class Description extends Serialization
{
    constructor() {
        super();
        this._type =
            Object.getPrototypeOf(this).constructor.name;
    }

    get type() {
        return this._type;
    }
}

export default Description;
