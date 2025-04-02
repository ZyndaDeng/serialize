import { SerializeFactory, serialize } from "../common/serialize";
import { serializeObj } from "./testBase";

class Vector{
    //标记了serialize 序列化只会对已经标记的字段序列化
    @serialize()
    x:int=0;
    @serialize()
    y:int=0;
    z:int=0;

    str:string="this will not serialize"

   
}

const factory = new SerializeFactory();
factory.registerJsonClass(Vector);

export function testDec(){
    let obj=new Vector();
    obj.x=1;
    obj.y=3;
    obj.z=4;
    obj.str="ikun";
    


    serializeObj(obj,factory);
}