'use strict'

import Description from '../module/desc';

class Category extends Description
{
    constructor(name, type) {
        super();
        this._name = name;
        this.typeName = type.name;
        this.list = {};

        /* prototype */
        this.type = type;
    }

    get name() {
        return this._name;
    }

    push(obj) {
        if(this.typeName == obj.constructor.name) {
            this.list[obj.uuid] = obj;
        }
    }
}

export default Category;
