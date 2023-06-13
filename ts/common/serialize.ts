

/**类和他的属性结构集合 */
let TypeMap: Map<Function, MetaData[]> = new Map();

type JsonValue = any;

interface InstanceData {
    ctor?: {
        class: string
        args?: Array<JsonValue>
    },
    data: JsonValue
}

interface CacheJson {
    main: JsonValue
    cache: Array<JsonValue>
}
interface CacheObj {
    cacheId: int
}
function isCacheObj(obj: any): obj is CacheObj {
    return obj && typeof obj.cacheId == "number";
}

class CacheMallc {
    protected instanceMap: Map<any, int> = new Map<any, int>();
    protected cache: Array<JsonValue> = [];

    reset() {
        this.instanceMap.clear();
        this.cache.splice(0);
    }

    alloc(instance: any) {
        let idx = this.instanceMap.get(instance);
        if (idx !== undefined) {
            return { idx: idx, isNew: false };
        }
        idx = this.cache.length;
        if (Array.isArray(instance)) {
            this.cache.push([])
        } else {
            this.cache.push({});
        }
        this.instanceMap.set(instance, idx);
        return { idx: idx, isNew: true };
    }

    pushJson(idx: int, json: JsonValue) {
        this.cache[idx] = json;
    }

    setCache(cache: Array<JsonValue>) {
        for (let json of this.cache) {
            cache.push(json);
        }
    }
}



class JsonAssemble {
    jsonCache: Array<JsonValue> = [];
    instanceMap: Map<int, any> = new Map<int, any>();

    reset() {
        this.jsonCache.splice(0);
        this.instanceMap.clear();
    }
}


/**
 * 属性序列化的参数
 */
export interface serializeArgs {
    /**反序列化时转换的类型 */
    type?: Constructor<any>,
    /**属性别名： 如果不想用属性本身的名字序列化 可以为这个参数赋值*/
    keyName?: string,
    /** 反序列化时用这个函数复制属性：有时候属性不能通过this.value=value的方式反序列化，而需要this.setValue(value)的方式的时候，为该值赋上setValue*/
    deserializedFunc?: Function
}



//gets meta data for a key name, creating a new meta data instance
//if the input array doesn't already define one for the given keyName
function getMetaData(array: Array<MetaData>, keyName: string): MetaData {
    for (var i = 0; i < array.length; i++) {
        if (array[i].keyName === keyName) {
            return array[i];
        }
    }
    array.push(new MetaData(keyName));
    return array[array.length - 1];
}


/**
 * 获得该类型的最适合注册了的类型 （部分类型可能没有注册 唯有找最接近的父类）
 * @param ctor 
 * @returns 
 */
function getFitType(ctor: Constructor<any> | Function | undefined) {
    let ret = ctor
    while (ret) {
        if (TypeMap.has(ret)) {
            return ret;
        }
        ret = (ret as any).__proto__;
    }
    return undefined;
}



//todo instance.constructor.prototype.__proto__ === parent class, maybe use this?
//because types are stored in a JS Map keyed by constructor, serialization is not inherited by default
//keeping this seperate by default also allows sub classes to serialize differently than their parent
/**
 * 类可序列化装饰器 用于定义该类和父类都可序列化
 */
export function inheritSerialization(): any {
    return function (childType: Function) {
        let parentType = (childType as any).__proto__;
        if (!parentType) return;
        var parentMetaData: Array<MetaData> = TypeMap.get(parentType) || [];
        var childMetaData: Array<MetaData> = TypeMap.get(childType) || [];
        for (var i = 0; i < parentMetaData.length; i++) {
            var keyName = parentMetaData[i].keyName;
            if (!MetaData.hasKeyName(childMetaData, keyName)) {
                childMetaData.push(MetaData.clone(parentMetaData[i]));
            }
        }
        TypeMap.set(childType, childMetaData);
    }
}


/**
 * 属性可序列化装饰器 使一个属性可以序列化和反序列化
 */
export function serialize(args?: serializeArgs) {
    //if (!keyNameOrType) return;
    let keyNameOrType = args ? args.type : undefined;
    let keyName = args ? args.keyName : undefined;
    //let indexable = args ? args.indexable : false;
    let deserializedFunc = args ? args.deserializedFunc : undefined;
    let { key, type } = { key: keyName, type: keyNameOrType };
    return function (target: any, actualKeyName: string): any {
        if (!target || !actualKeyName) return;
        var metaDataList: Array<MetaData> = TypeMap.get(target.constructor) || [];
        var metadata = getMetaData(metaDataList, actualKeyName);
        var serialKey = (key) ? key : actualKeyName;
        metadata.deserializedKey = serialKey;
        metadata.deserializedType = type;
        metadata.serializedKey = serialKey;
        metadata.serializedType = type;
        // metadata.indexable = indexable == true;
        metadata.deserializedFunc = deserializedFunc;

        TypeMap.set(target.constructor, metaDataList);
    };
}

//helper class to contain serialization meta data for a property, each property
//in a type tagged with a serialization annotation will contain an array of these
//objects each describing one property
/**
 * 属性结构
 */
class MetaData {
    /**属性序列化或反序列化时的名字 */
    public keyName: string;    //the key name of the property this meta data describes
    /**序列化时对应的属性名字 */
    public serializedKey?: string; //the target keyname for serializing
    /**反序列化时对应的属性名字 */
    public deserializedKey?: string;    //the target keyname for deserializing
    /**序列化时转换的类型 */
    public serializedType?: Function; //the type or function to use when serializing this property
    /**反序列化时转换的类型 */
    public deserializedType?: Constructor<any>;  //the type or function to use when deserializing this property
    /**反序列化时的赋值方式 */
    public deserializedFunc?: Function;
    /**是否为键值对 */
    // public indexable: boolean;

    constructor(keyName: string) {
        this.keyName = keyName;
        //this.indexable = false;
    }

    //checks for a key name in a meta data array
    public static hasKeyName(metadataArray: Array<MetaData>, key: string): boolean {
        for (var i = 0; i < metadataArray.length; i++) {
            if (metadataArray[i].keyName === key) return true;
        }
        return false;
    }

    //clone a meta data instance, used for inheriting serialization properties
    public static clone(data: MetaData): MetaData {
        var metadata = new MetaData(data.keyName);
        metadata.deserializedKey = data.deserializedKey;
        metadata.serializedKey = data.serializedKey;
        metadata.serializedType = data.serializedType;
        metadata.deserializedType = data.deserializedType;
        // metadata.indexable = data.indexable;
        metadata.deserializedFunc = data.deserializedFunc;
        return metadata;
    }
}


class Deserializer {
    protected instanceMap: Map<int, any> = new Map<int, any>();
    protected cache: Array<InstanceData> = [];

    constructor(protected readonly jsonClassCache: { [classname: string]: Constructor<any> }) {

    }

    reset() {
        this.instanceMap.clear();
        this.cache.splice(0);
    }

    deserialize(value: CacheJson): any {
        this.reset();
        this.cache = value.cache;
        let ret = this.deserialzeItem(value.main);
        return ret;
    }

    protected deserialzeItem(json: JsonValue | CacheObj) {
        if (isCacheObj(json)) {
            let idx = json.cacheId;
            return this.getCacheInstance(idx);
        }
        if (Array.isArray(json)) {
            return this.deserializeArray(json);
        } else {
            return json
        }
    }

    protected getCacheInstance(idx: int) {
        let inst = this.instanceMap.get(idx);
        if (inst) return inst;
        inst = this.deserialzeIntoCache(idx);
        return inst;

    }

    protected deserialzeIntoCache(idx: int) {
        let json = this.cache[idx];
        let clazz = json.ctor?.class;
        let inst: any = undefined
        let setDataFunc: undefined | ((data: InstanceData, instance: any) => void) = undefined;
        if (clazz) {
            if (clazz == "Map") {
                inst = new Map();
                setDataFunc = (d, i) => {
                    this.deserialzeMap(d, i);
                }
            } else if (clazz == "Date") {
                inst = new Date(json.data);
            } else if (clazz == "RegExp") {
                inst = new RegExp(json.data);
            } else {
                inst = this.buildInstance(json);
                setDataFunc = (d, i) => {
                    this.deserialzeTypeObjectInto(d, i);
                }
            }

        } else {
            inst = {};
            setDataFunc = (d, i) => {
                this.deserialzeIndexableObject(d, i);
            }
        }
        this.instanceMap.set(idx, inst);
        setDataFunc?.(json, inst);
        return inst;
    }

    protected deserialzeMap(data: InstanceData, instance: Map<any, any>) {
        let pairs: Array<{ key: JsonValue, value: JsonValue }> = data.data.pairs;
        for (let pair of pairs) {
            let key = this.deserialzeItem(pair.key);
            let value = this.deserialzeItem(pair.value);
            instance.set(key, value);
        }
    }

    protected deserialzeTypeObjectInto(data: InstanceData, instance: any) {
        let clazz = data.ctor?.class;

        if (clazz) {
            let type = this.getJsonClass(clazz);
            let fitType = getFitType(type) as Constructor<any>;
            let metadataArray = TypeMap.get(fitType as Function);
            if (metadataArray) {
                for (let metadata of metadataArray) {
                    if (!metadata.deserializedKey) continue;
                    let key = metadata.deserializedKey;
                    let source = data.data[key];
                    let keyName = metadata.keyName;
                    let dest = this.deserialzeItem(source);
                    if (metadata.deserializedFunc) {
                        metadata.deserializedFunc.call(instance, dest);
                    } else {
                        instance[keyName] = dest;
                    }
                }
            }else{
                this.deserialzeIndexableObject(data,instance);
            }
        }


    }

    protected deserialzeIndexableObject(data: InstanceData, instance: any) {
        Object.keys(data.data).forEach(k => {
            instance[k] = this.deserialzeItem(data.data[k]);
        })
    }

    protected getJsonClass(className: string) {
        return this.jsonClassCache[className];
    }

    protected buildInstance<T>(json: InstanceData): T {
        let ctorArgs = json.ctor?.args;

        let instance: T;
        // if (ctorArgs && Array.isArray(ctorArgs)) {
        //     let args = this.deserializeArray(ctorArgs);
        //     instance = new type(...args);
        // } else 
        if (json.ctor?.class) {
            let type = this.getJsonClass(json.ctor.class);
            if (type) instance = new type() as T;
            else instance = {} as T;
        } else {
            instance = {} as T;
        }
        return instance;
    }

    protected deserializeArray(jsonArr: JsonValue[]) {
        let ret = new Array<any>();
        for (let json of jsonArr) {
            ret.push(this.deserialzeItem(json));
        }
        return ret;
    }
}



export class SerializeFactory {

    //#region 构造
    /**用于保存可以序列化的类的名字和类构造函数 */
    protected jsonClassCache: { [classname: string]: Constructor<any> } = {};

    /**
 * 注册可以序列化的类和类在序列化的名字
 * @param classname 要序列化的类的名字
 * @param t 要序列化的类的构造函数
 */
    registerJsonClass(t: Constructor<any>) {
        this.jsonClassCache[t.name] = t;
    }

    /**
     * 获得注册了的对应类名的构造函数
     * @param classname 
     */
    protected getJsonClass(classname: string): Constructor<any> | undefined {
        if (classname == undefined) return undefined;
        return this.jsonClassCache[classname];
    }

    //#endregion

    //#region 序列化
    /**
 * 序列化一个对象
 * @param instance 要序列化的对象
 */
    serialize(instance: any): JsonValue {
        if (instance == undefined) return undefined;
        let ret: CacheJson = {
            main: undefined,
            cache: []
        }
        this.cacheAllc.reset();
        let json = this.serializeItem(instance);
        if (json) {
            ret.main = json;
            this.cacheAllc.setCache(ret.cache);
        } else {
            return undefined
        }
        return ret;
    }

    protected cacheAllc = new CacheMallc();
    protected cacheObj(instance: any): CacheObj {
        let alloc = this.cacheAllc.alloc(instance);
        if (alloc.isNew) this.cacheAllc.pushJson(alloc.idx, this.serializeRefType(instance));
        return {
            cacheId: alloc.idx
        }
    }

    protected serializeRefType(instance: any) {
        let ret: JsonValue = undefined;
        if (typeof instance == "object") {
            do {
                let rightType = undefined
                if (instance.constructor) rightType = getFitType(instance.constructor) as Constructor<any>
                if (rightType) {
                    ret = this.serializeTypedObjectWithCache(instance, rightType);
                    break;
                }

                if (instance instanceof Map) {
                    ret = this.serializeMap(instance);
                    break;
                }

                if (instance instanceof Date) {
                    ret = this.serializeDate(instance);
                    break;
                }

                if (instance instanceof RegExp) {
                    ret = this.serializeRegExp(instance);
                    break;
                }
                //未被装饰过 按所有属性序列化
                let keys = Object.keys(instance);
                let json: any = {};
                for (let key of keys) {
                    //todo this probably needs a key transform
                    json[key] = this.serializeItem(instance[key]);
                }
                ret = {
                    ctor: { class: instance.constructor.name },
                    data: json
                }
                break;
            } while (false);

        }
        return ret;
    }

    protected serializeTypedObjectWithCache(instance: any, type: Constructor<any>) {
        let json: JsonValue = {};

        let metadataArray = TypeMap.get(type);
        if (metadataArray) {
            for (let i = 0; i < metadataArray.length; i++) {
                let metadata = metadataArray[i];

                if (!metadata.serializedKey) continue;

                let serializedKey = metadata.serializedKey;

                let source = instance[metadata.keyName];

                if (source == undefined) continue;

                let value = this.serializeItem(source);
                if (value != undefined) {
                    json[serializedKey] = value;
                }
            }
        }

        let ret: InstanceData = {
            ctor: { class: instance.constructor.name },
            data: json
        }
        return ret;
    }

    protected serializeItem(instance: any): JsonValue {
        if (instance == undefined) return undefined;
        let ret = undefined;

        if (Array.isArray(instance)) {
            ret = this.serializeArray(instance);
        } else if (typeof instance == "object") {
            ret = this.cacheObj(instance);
        } else {
            ret = instance;
        }
        return ret;
    }

    protected serializeArray(source: Array<any>): Array<JsonValue> {
        var serializedArray: Array<any> = new Array(source.length);
        for (var j = 0; j < source.length; j++) {
            serializedArray[j] = this.serializeItem(source[j]);
        }
        return serializedArray;
    }


    protected serializeMap(source: Map<any, any>): InstanceData {
        let json: JsonValue = {};
        json.pairs = [];
        for (var key of source.keys()) {
            const value = source.get(key);
            const pair = {
                key: this.serializeItem(key),
                value: this.serializeItem(value)
            }
            json.pairs.push(pair);
        }
        let ret: InstanceData = {
            ctor: {
                class: "Map"
            },
            data: json
        }
        return ret;
    }

    protected serializeDate(date: Date): InstanceData {
        return {
            ctor: {
                class: "Date"
            },
            data: date.toISOString()
        }
    }

    protected serializeRegExp(regExp: RegExp): InstanceData {
        return {
            ctor: {
                class: "RegExp"
            },
            data: regExp.toString()
        }
    }
    //#endregion

    //#region 反序列化


    deserialize<T>(json: CacheJson): T {
        let d = new Deserializer(this.jsonClassCache);
        return d.deserialize(json);
    }

    //#endregion

}
