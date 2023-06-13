"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testBase = exports.serializeObj = void 0;
const serialize_1 = require("../common/serialize");
class BaseObj {
    constructor() {
        this.i = 0;
        this.str = "";
        this.b = false;
        this.arr = [];
        this.obj = {};
        this.map = new Map();
        this.date = new Date();
    }
}
const factory = new serialize_1.SerializeFactory();
factory.registerJsonClass(BaseObj);
function serializeObj(obj, factory) {
    let json = factory.serialize(obj);
    console.log("原来对象和序列化后结果是:", obj, json);
    const other = factory.deserialize(json);
    console.log("反序列化后对象是:", json, other);
}
exports.serializeObj = serializeObj;
function testBase() {
    let obj = new BaseObj();
    obj.i = 1;
    obj.str = "abc";
    obj.arr = [1, 2, 3];
    obj.obj["k"] = "ikun";
    obj.map.set(4, "van");
    serializeObj(obj, factory);
}
exports.testBase = testBase;
