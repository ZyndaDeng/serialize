"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializeFactory = exports.serialize = exports.inheritSerialization = void 0;
/**类和他的属性结构集合 */
let TypeMap = new Map();
function isCacheObj(obj) {
    return obj && typeof obj.cacheId == "number";
}
class CacheMallc {
    constructor() {
        this.instanceMap = new Map();
        this.cache = [];
    }
    reset() {
        this.instanceMap.clear();
        this.cache.splice(0);
    }
    alloc(instance) {
        let idx = this.instanceMap.get(instance);
        if (idx !== undefined) {
            return { idx: idx, isNew: false };
        }
        idx = this.cache.length;
        if (Array.isArray(instance)) {
            this.cache.push([]);
        }
        else {
            this.cache.push({});
        }
        this.instanceMap.set(instance, idx);
        return { idx: idx, isNew: true };
    }
    pushJson(idx, json) {
        this.cache[idx] = json;
    }
    setCache(cache) {
        for (let json of this.cache) {
            cache.push(json);
        }
    }
}
class JsonAssemble {
    constructor() {
        this.jsonCache = [];
        this.instanceMap = new Map();
    }
    reset() {
        this.jsonCache.splice(0);
        this.instanceMap.clear();
    }
}
//gets meta data for a key name, creating a new meta data instance
//if the input array doesn't already define one for the given keyName
function getMetaData(array, keyName) {
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
function getFitType(ctor) {
    let ret = ctor;
    while (ret) {
        if (TypeMap.has(ret)) {
            return ret;
        }
        ret = ret.__proto__;
    }
    return undefined;
}
//todo instance.constructor.prototype.__proto__ === parent class, maybe use this?
//because types are stored in a JS Map keyed by constructor, serialization is not inherited by default
//keeping this seperate by default also allows sub classes to serialize differently than their parent
/**
 * 类可序列化装饰器 用于定义该类和父类都可序列化
 */
function inheritSerialization() {
    return function (childType) {
        let parentType = childType.__proto__;
        if (!parentType)
            return;
        var parentMetaData = TypeMap.get(parentType) || [];
        var childMetaData = TypeMap.get(childType) || [];
        for (var i = 0; i < parentMetaData.length; i++) {
            var keyName = parentMetaData[i].keyName;
            if (!MetaData.hasKeyName(childMetaData, keyName)) {
                childMetaData.push(MetaData.clone(parentMetaData[i]));
            }
        }
        TypeMap.set(childType, childMetaData);
    };
}
exports.inheritSerialization = inheritSerialization;
/**
 * 属性可序列化装饰器 使一个属性可以序列化和反序列化
 */
function serialize(args) {
    //if (!keyNameOrType) return;
    let keyNameOrType = args ? args.type : undefined;
    let keyName = args ? args.keyName : undefined;
    //let indexable = args ? args.indexable : false;
    let deserializedFunc = args ? args.deserializedFunc : undefined;
    let { key, type } = { key: keyName, type: keyNameOrType };
    return function (target, actualKeyName) {
        if (!target || !actualKeyName)
            return;
        var metaDataList = TypeMap.get(target.constructor) || [];
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
exports.serialize = serialize;
//helper class to contain serialization meta data for a property, each property
//in a type tagged with a serialization annotation will contain an array of these
//objects each describing one property
/**
 * 属性结构
 */
class MetaData {
    /**是否为键值对 */
    // public indexable: boolean;
    constructor(keyName) {
        this.keyName = keyName;
        //this.indexable = false;
    }
    //checks for a key name in a meta data array
    static hasKeyName(metadataArray, key) {
        for (var i = 0; i < metadataArray.length; i++) {
            if (metadataArray[i].keyName === key)
                return true;
        }
        return false;
    }
    //clone a meta data instance, used for inheriting serialization properties
    static clone(data) {
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
    constructor(jsonClassCache) {
        this.jsonClassCache = jsonClassCache;
        this.instanceMap = new Map();
        this.cache = [];
    }
    reset() {
        this.instanceMap.clear();
        this.cache.splice(0);
    }
    deserialize(value) {
        this.reset();
        this.cache = value.cache;
        let ret = this.deserialzeItem(value.main);
        return ret;
    }
    deserialzeItem(json) {
        if (isCacheObj(json)) {
            let idx = json.cacheId;
            return this.getCacheInstance(idx);
        }
        if (Array.isArray(json)) {
            return this.deserializeArray(json);
        }
        else {
            return json;
        }
    }
    getCacheInstance(idx) {
        let inst = this.instanceMap.get(idx);
        if (inst)
            return inst;
        inst = this.deserialzeIntoCache(idx);
        return inst;
    }
    deserialzeIntoCache(idx) {
        let json = this.cache[idx];
        let clazz = json.ctor?.class;
        let inst = undefined;
        let setDataFunc = undefined;
        if (clazz) {
            if (clazz == "Map") {
                inst = new Map();
                setDataFunc = (d, i) => {
                    this.deserialzeMap(d, i);
                };
            }
            else if (clazz == "Date") {
                inst = new Date(json.data);
            }
            else if (clazz == "RegExp") {
                inst = new RegExp(json.data);
            }
            else {
                inst = this.buildInstance(json);
                setDataFunc = (d, i) => {
                    this.deserialzeTypeObjectInto(d, i);
                };
            }
        }
        else {
            inst = {};
            setDataFunc = (d, i) => {
                this.deserialzeIndexableObject(d, i);
            };
        }
        this.instanceMap.set(idx, inst);
        setDataFunc?.(json, inst);
        return inst;
    }
    deserialzeMap(data, instance) {
        let pairs = data.data.pairs;
        for (let pair of pairs) {
            let key = this.deserialzeItem(pair.key);
            let value = this.deserialzeItem(pair.value);
            instance.set(key, value);
        }
    }
    deserialzeTypeObjectInto(data, instance) {
        let clazz = data.ctor?.class;
        if (clazz) {
            let type = this.getJsonClass(clazz);
            let fitType = getFitType(type);
            let metadataArray = TypeMap.get(fitType);
            if (metadataArray) {
                for (let metadata of metadataArray) {
                    if (!metadata.deserializedKey)
                        continue;
                    let key = metadata.deserializedKey;
                    let source = data.data[key];
                    let keyName = metadata.keyName;
                    let dest = this.deserialzeItem(source);
                    if (metadata.deserializedFunc) {
                        metadata.deserializedFunc.call(instance, dest);
                    }
                    else {
                        instance[keyName] = dest;
                    }
                }
            }
            else {
                this.deserialzeIndexableObject(data, instance);
            }
        }
    }
    deserialzeIndexableObject(data, instance) {
        Object.keys(data.data).forEach(k => {
            instance[k] = this.deserialzeItem(data.data[k]);
        });
    }
    getJsonClass(className) {
        return this.jsonClassCache[className];
    }
    buildInstance(json) {
        let ctorArgs = json.ctor?.args;
        let instance;
        // if (ctorArgs && Array.isArray(ctorArgs)) {
        //     let args = this.deserializeArray(ctorArgs);
        //     instance = new type(...args);
        // } else 
        if (json.ctor?.class) {
            let type = this.getJsonClass(json.ctor.class);
            if (type)
                instance = new type();
            else
                instance = {};
        }
        else {
            instance = {};
        }
        return instance;
    }
    deserializeArray(jsonArr) {
        let ret = new Array();
        for (let json of jsonArr) {
            ret.push(this.deserialzeItem(json));
        }
        return ret;
    }
}
class SerializeFactory {
    constructor() {
        //#region 构造
        /**用于保存可以序列化的类的名字和类构造函数 */
        this.jsonClassCache = {};
        this.cacheAllc = new CacheMallc();
        //#endregion
    }
    /**
 * 注册可以序列化的类和类在序列化的名字
 * @param classname 要序列化的类的名字
 * @param t 要序列化的类的构造函数
 */
    registerJsonClass(t) {
        this.jsonClassCache[t.name] = t;
    }
    /**
     * 获得注册了的对应类名的构造函数
     * @param classname
     */
    getJsonClass(classname) {
        if (classname == undefined)
            return undefined;
        return this.jsonClassCache[classname];
    }
    //#endregion
    //#region 序列化
    /**
 * 序列化一个对象
 * @param instance 要序列化的对象
 */
    serialize(instance) {
        if (instance == undefined)
            return undefined;
        let ret = {
            main: undefined,
            cache: []
        };
        this.cacheAllc.reset();
        let json = this.serializeItem(instance);
        if (json) {
            ret.main = json;
            this.cacheAllc.setCache(ret.cache);
        }
        else {
            return undefined;
        }
        return ret;
    }
    cacheObj(instance) {
        let alloc = this.cacheAllc.alloc(instance);
        if (alloc.isNew)
            this.cacheAllc.pushJson(alloc.idx, this.serializeRefType(instance));
        return {
            cacheId: alloc.idx
        };
    }
    serializeRefType(instance) {
        let ret = undefined;
        if (typeof instance == "object") {
            do {
                let rightType = undefined;
                if (instance.constructor)
                    rightType = getFitType(instance.constructor);
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
                let json = {};
                for (let key of keys) {
                    //todo this probably needs a key transform
                    json[key] = this.serializeItem(instance[key]);
                }
                ret = {
                    ctor: { class: instance.constructor.name },
                    data: json
                };
                break;
            } while (false);
        }
        return ret;
    }
    serializeTypedObjectWithCache(instance, type) {
        let json = {};
        let metadataArray = TypeMap.get(type);
        if (metadataArray) {
            for (let i = 0; i < metadataArray.length; i++) {
                let metadata = metadataArray[i];
                if (!metadata.serializedKey)
                    continue;
                let serializedKey = metadata.serializedKey;
                let source = instance[metadata.keyName];
                if (source == undefined)
                    continue;
                let value = this.serializeItem(source);
                if (value != undefined) {
                    json[serializedKey] = value;
                }
            }
        }
        let ret = {
            ctor: { class: instance.constructor.name },
            data: json
        };
        return ret;
    }
    serializeItem(instance) {
        if (instance == undefined)
            return undefined;
        let ret = undefined;
        if (Array.isArray(instance)) {
            ret = this.serializeArray(instance);
        }
        else if (typeof instance == "object") {
            ret = this.cacheObj(instance);
        }
        else {
            ret = instance;
        }
        return ret;
    }
    serializeArray(source) {
        var serializedArray = new Array(source.length);
        for (var j = 0; j < source.length; j++) {
            serializedArray[j] = this.serializeItem(source[j]);
        }
        return serializedArray;
    }
    serializeMap(source) {
        let json = {};
        json.pairs = [];
        for (var key of source.keys()) {
            const value = source.get(key);
            const pair = {
                key: this.serializeItem(key),
                value: this.serializeItem(value)
            };
            json.pairs.push(pair);
        }
        let ret = {
            ctor: {
                class: "Map"
            },
            data: json
        };
        return ret;
    }
    serializeDate(date) {
        return {
            ctor: {
                class: "Date"
            },
            data: date.toISOString()
        };
    }
    serializeRegExp(regExp) {
        return {
            ctor: {
                class: "RegExp"
            },
            data: regExp.toString()
        };
    }
    //#endregion
    //#region 反序列化
    deserialize(json) {
        let d = new Deserializer(this.jsonClassCache);
        return d.deserialize(json);
    }
}
exports.SerializeFactory = SerializeFactory;
