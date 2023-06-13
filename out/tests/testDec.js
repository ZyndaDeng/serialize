"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDec = void 0;
const serialize_1 = require("../common/serialize");
const testBase_1 = require("./testBase");
class Vector {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.str = "this will not serialize";
    }
}
__decorate([
    (0, serialize_1.serialize)()
], Vector.prototype, "x", void 0);
__decorate([
    (0, serialize_1.serialize)()
], Vector.prototype, "y", void 0);
const factory = new serialize_1.SerializeFactory();
factory.registerJsonClass(Vector);
function testDec() {
    let obj = new Vector();
    obj.x = 1;
    obj.y = 3;
    obj.z = 4;
    obj.str = "ikun";
    (0, testBase_1.serializeObj)(obj, factory);
}
exports.testDec = testDec;
