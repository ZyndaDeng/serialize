import { SerializeFactory, serialize } from "../common/serialize";
import { serializeObj } from "./testBase";

class Node{
    @serialize({type:Node})
    prev:Node|undefined
    @serialize({type:Node})
    next:Node|undefined
}

class List{
    @serialize({type:Node})
    first:Node|undefined

    constructor(){
        this.first=new Node();
        const next=new Node();
        this.first.next=next;
        next.prev=this.first;
    }
}

const factory = new SerializeFactory();
factory.registerJsonClass(Node);
factory.registerJsonClass(List);

 function testCircRef(){
    let obj=new List();
    
    let first=new Node();
    let next=new Node();
    first.next=next;
    next.prev=first;
    obj.first=first;
    
    serializeObj(obj,factory);
}

testCircRef();