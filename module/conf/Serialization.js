'use strict'

const serialize = require('node-serialize');

class Serialization
{
    serialize(object) {
        let serialized = serialize.serialize(object);
        console.log(serialized);
    }

    unserialize() {
    }
}

export default Serialization;
