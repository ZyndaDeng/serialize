
这是一个typescript序列化工具。相比于JavaScript的JSON系列化，该工具支持Map类型序列化 支持循环引用的序列化

支持typescript所有类型(当然啦 不包括function)
```typescript
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

//序列化
 let json = factory.serialize(obj);
 //反序列化
 const other = factory.deserialize(json);
```

如果想指定序列化的属性 可以使用装饰器
```typescript
class Vector{
    @serialize()
    x:int=0;
    @serialize()
    y:int=0;

    str:string="this will not serialize" 
}
```
上面例子只会对xy序列化 要对字段有更细致的调整 可参考例子[testDecAdv](./ts/tests/testDecAdv.ts)

支持存在循环引用的类型 反序列化之后也保留这引用关系
```typescript
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
    }
}

    let obj=new List();
    
    let first=new Node();
    let next=new Node();
    first.next=next;
    next.prev=first;
    obj.first=first;
```
