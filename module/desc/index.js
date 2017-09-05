'use strict'

const serializer = require('node-serialize');

import Serialization from '../conf/Serialization'

class Description
{
    constructor(description) {
        this._description = description;

        this.serialization = new Serialization();
    }

    get description() {
        return this._description;
    }

    serialize() {
        this.serialization.serialize(this);
    }

    unserialize() {
        this.serialization.unserialize();
    }
}

export default Description;
