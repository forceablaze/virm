'use strict'

class Category
{
    constructor(name, type) {
        this._name = name;
        this.list = [];
        this.type = type;
    }

    get name() {
        return this._name;
    }

    push(obj) {
        console.log(obj.constructor.name);
        console.log(this.type);
        this.list.push(obj);
    }
}

export default Category;
