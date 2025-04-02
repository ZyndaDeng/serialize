import { SerializeFactory, serialize } from "../common/serialize";
import { serializeObj } from "./testBase";

class Element{
    //标记了serialize 序列化只会对已经标记的字段序列化
    @serialize()
    name:string="";
    @serialize()
    x:number=0;
    @serialize()
    y:number=0;
    //参数keyName 用zOrder名称序列化_zOrder字段
    @serialize({keyName:"zOrder"})
    protected _zOrder:number=0;
    //该字段有undefined的情况 可以设置type明确类型
    @serialize({keyName:"parent",type:Element})
    protected _parent:Element|undefined
    @serialize({keyName:"children"})
    protected _children:Array<Element>=[]

    addChild(ele:Element){
        this._children.push(ele);
        ele._parent=this;
    }

    
    str:string="this will not serialize"

   
}

const factory = new SerializeFactory();
factory.registerJsonClass(Element);

export function testDec(){
    let obj=new Element();
    obj.name="father"
    obj.x=1;
    obj.y=3;
    obj.str="ikun";
    
    let child1=new Element();
    child1.name="son1";
    obj.addChild(child1);

    let child2=new Element();
    child2.name="son2";
    obj.addChild(child2);


    serializeObj(obj,factory);
}