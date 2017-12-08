'use strict'

const fs = require('fs');
const serialize = require('node-serialize');

class Serialization
{
    serialize(path) {
//        let serialized = serialize.serialize(this);

        let serialized = JSON.stringify(this, null, 2);
        fs.writeFile(path, serialized, 'utf8', (err) => {
            if (err) throw err;
        });
    }

    unserialize(path) {
        let objString;

        try {
            objString = fs.readFileSync(path, 'utf8').toString();
        } catch(e) {
            throw e;
        }
//        return serialize.unserialize(objString);
        return JSON.parse(objString);
    }

    toString() {
        return serialize.serialize(this);
    }
}

export default Serialization;
