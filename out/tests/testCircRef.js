"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const serialize_1 = require("../common/serialize");
const testBase_1 = require("./testBase");
class Node {
}
__decorate([
    (0, serialize_1.serialize)({ type: Node })
], Node.prototype, "prev", void 0);
__decorate([
    (0, serialize_1.serialize)({ type: Node })
], Node.prototype, "next", void 0);
class List {
    constructor() {
        this.first = new Node();
        const next = new Node();
        this.first.next = next;
        next.prev = this.first;
    }
}
__decorate([
    (0, serialize_1.serialize)({ type: Node })
], List.prototype, "first", void 0);
const factory = new serialize_1.SerializeFactory();
factory.registerJsonClass(Node);
factory.registerJsonClass(List);
function testCircRef() {
    let obj = new List();
    let first = new Node();
    let next = new Node();
    first.next = next;
    next.prev = first;
    obj.first = first;
    (0, testBase_1.serializeObj)(obj, factory);
}
testCircRef();
