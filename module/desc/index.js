'use strict'

import Serialization from '../conf/Serialization'

class Description extends Serialization
{
    constructor(description) {
        super();
        this._description = description;
    }

    get description() {
        return this._description;
    }
}

export default Description;
