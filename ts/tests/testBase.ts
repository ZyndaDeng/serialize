import { SerializeFactory } from "../common/serialize";

class BaseObj{

    i:number=0;
    str:string="";
    b:boolean=false;
    arr:Array<number>=[];
    obj:any={};
    map:Map<int,string>=new Map();
    date:Date=new Date();
}

const factory = new SerializeFactory();
factory.registerJsonClass(BaseObj);

export function serializeObj(obj: any,factory:SerializeFactory) {
    let json = factory.serialize(obj);
    console.log("原来对象和序列化后结果是:", obj, json);
    const other = factory.deserialize(json);
    console.log("反序列化后对象是:", json, other);
}

export function testBase(){
    let obj=new BaseObj();
    obj.i=1;
    obj.str="abc";
    obj.arr=[1,2,3];
    obj.obj["k"]="ikun"
    obj.map.set(4,"van");


    serializeObj(obj,factory);
}
