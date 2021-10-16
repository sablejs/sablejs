![LOGO](./logo.jpg)

![linux ci](https://github.com/sablejs/sablejs/actions/workflows/linux.yml/badge.svg)
![osx ci](https://github.com/sablejs/sablejs/actions/workflows/osx.yml/badge.svg)
![windows ci](https://github.com/sablejs/sablejs/actions/workflows/win.yml/badge.svg)
<a href="https://www.npmjs.com/package/sablejs"><img src="https://img.shields.io/npm/v/sablejs.svg?sanitize=true" alt="Version"></a>

> 友验智能验证码由 sablejs 强力驱动, 点击了解更多(http://fastyotest.com/)

[English](./README.md) | 简体中文

🏖️ 使用JavaScript编写的更快更安全的JavaScript解释器，其可以用来：

1. 执行沙盒(类似于Figma的插件沙盒，但是更易于使用)；
2. 小游戏/小程序的动态执行；
3. 通过将JavaScript编译为opcode进行代码保护；

sablejs已经覆盖了约95%的 [test262 es5-tests cases](https://github.com/tc39/test262/tree/es5-tests)，其可以很安全可靠的用于你的生产之中。

* [快速开始](https://github.com/sablejs/sablejs/blob/master/README-zh_CN.md#快速开始)
* [APIs](https://github.com/sablejs/sablejs/blob/master/README-zh_CN.md#apis)
* [性能测试](https://github.com/sablejs/sablejs/blob/master/README-zh_CN.md#性能测试)
* [限制](https://github.com/sablejs/sablejs/blob/master/README-zh_CN.md#限制)
* [使用协议](https://github.com/sablejs/sablejs/blob/master/README-zh_CN.md#使用协议)

### 快速开始

**sablejs分离出了编译器和解释器**，因此我们移除了规范之中一些需要动态执行的相关API(详情见 [限制](https://github.com/sablejs/sablejs/blob/master/README-zh_CN.md#限制))。简而言之, 你需要先使用sablejs cli编译你的JavaScript代码，然后才能使用解释器进行执行。

#### 示例代码

假设我们编写了 `fib.js` 中的代码:

```javascript
function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

var start = Date.now();
console.log("[INFO] fib: " + fib(30));
console.log("[INFO] time consuming: " + (Date.now() - start) + "ms");
```

#### 编译代码

```shell
> npm i sablejs -g
> sablejs -i fib.js -o output # 你将获得一个base64字符串的生成文件
```

sablejs cli包含了如下的命令:

```shell
Usage: sablejs [options]

Options:
  -v, --vers           输出当前版本号
  -i, --input <path>   指定编译的文件路径
  -o, --output <path>  指定输出的文件路径
  -j, --json           直接输出JSON产物，不进行Base64编码
  -s, --slient         静默模式，不输出日志
  -h, --help
```

#### 执行代码

```shell
> npm install sablejs --save
```

你也可以直接通过script标签进行运行时的引入：

```html
<script src="https://cdn.jsdelivr.net/npm/sablejs@1.0.5/runtime.js"></script>
```

##### 浏览器环境

```javascript
const VM = require("sablejs/runtime")();

// import console.log function to vm call
const vm = new VM();
const vGlobal = vm.getGlobal();
const vConsole = vm.createObject();
const vLog = vm.createFunction("log", function () {
  const temp = [];
  for (let i = 0; i < arguments.length; i++) {
    temp.push(vm.asString(arguments[i]));
  }

  console.log(...temp);
  return vm.createUndefined();
});

vm.setProperty(vConsole, "log", vLog);
vm.setProperty(vGlobal, "console", vConsole);

(async () => {
  const resp = await fetch("<output url>");
  const data = await resp.text();
  vm.run(data);
  vm.destroy();
})();
```

##### Node.js环境

```javascript
const VM = require("sablejs/runtime")();
const fs = require("fs");

// import console.log function to vm call
const vm = new VM();
const vGlobal = vm.getGlobal();
const vConsole = vm.createObject();
const vLog = vm.createFunction("log", function () {
  const temp = [];
  for (let i = 0; i < arguments.length; i++) {
    temp.push(vm.asString(arguments[i]));
  }

  console.log(...temp);
  return vm.createUndefined();
});

vm.setProperty(vConsole, "log", vLog);
vm.setProperty(vGlobal, "console", vConsole);

// please run: sablejs -i fib.js -o output
vm.run(fs.readFileSync("./output").toString());
vm.destroy();
```

### APIs

- VM.prototype.run(source)
  - source: String
  - `return:` undefined

初始化VM并执行编译的代码。  

```javascript
const VM = require('sablejs/runtime')();
const vm = new VM();

// source should be base64 string via sablejs compiling
vm.run(`<compile source string>`);
```

- VM.prototype.getGlobal()
  - `return:` Value

返回VM的 `global` 对象，其类似于浏览器环境中的 `window` 对象呢及Node.js环境的 `global` 对象。

```javascript
const global = vm.getGlobal();
```

- VM.prototype.createUndefined()
  - `return` Value

创建 `undefined` 的包装类型。

```javascript
const vUndefined = vm.createUndefined();
```

- VM.prototype.createNull()
  - `return:` Value

创建 `null` 的包装类型。

```javascript
const vNull = vm.createNull();
```

- VM.prototype.createBoolean(bool)
  - bool: Boolean
  - `return` Value

创建 `bool` 的包装类型。

```javascript
const vBoolean = vm.createBoolean(true);
```

- VM.prototype.createNumber(num)
  - num: Number
  - `return` Value

创建 `number` 的包装类型。

```javascript
const vNumber = vm.createNumber(1024);
```

- VM.prototype.createString(str)
  - str: String
  - `return` Value

创建 `string` 的包装类型。

```javascript
const vString = vm.createString('Hello World!');
```


- VM.prototype.createObject()
  - `return` Value

创建 `object` 的包装类型。

```javascript
const vObject = vm.createObject();
```

- VM.prototype.createArray(length)
  - length: Number | undefined
  - `return` Value

创建 `array` 的包装类型。

```javascript
const vArray1 = vm.createArray();
// or
const vArray2 = vm.createArray(128);
```

- VM.prototype.createFunction(name, func)
  - name: String
  - func: Function
  - `return` Value

创建 `function` 的包装类型。其接收函数名 `name` 及具体函数实现 `func` 两个参数。但需要注意的是，其函数入参及 `this` 均为包装类型。

```javascript
const vFuncntion = vm.createFunction("trim", function(str) {
  // this is the undefined or new's instannce boxed type
  // str maybe the string boxed type, we need to check it
});
```

- VM.prototype.createError(message)
  - message: String | undefined
  - `return` Value

创建 `error` 的包装类型。

```javascript
const vError1 = vm.createError();
// or
const vError2 = vm.createError("unknown error");
```

- VM.prototype.createRegExp(pattern, flags)
  - pattern: String
  - flags: String | undefined
  - `return` Value

创建 `regexp` 的包装类型。

```javascript
const vRegExp = vm.createRegExp("\\w+", "ig");
```

- VM.prototype.createDate()
  - `return` Value

创建 `date` 的包装类型。

```javascript
const vDate = vm.createDate();
```

- VM.prototype.isUndefined(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `undefined`。

```javascript
const vUndefined = vm.createUndefined();
if(vm.isUndefined(vUndefined)) {
  // ...
}
```

- VM.prototype.isNull(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `null`。

```javascript
const vNull = vm.createNull();
if(vm.isNull(vNull)) {
  // ...
}
```

- VM.prototype.isBoolean(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `bool`。

```javascript
const vBoolean = vm.createBoolean(true);
if(vm.isBoolean(vBoolean)) {
  // ...
}
```

- VM.prototype.isNumber(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `number`。

```javascript
const vNumber = vm.createNumber(1024);
if(vm.isNumber(vNumber)) {
  // ...
}
```

- VM.prototype.isString(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `string`。

```javascript
const vString = vm.createString("Hello World!");
if(vm.isString(vString)) {
  // ...
}
```

- VM.prototype.isObject(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `object`。

```javascript
const vObject = vm.createObject();
const vArray = vm.createArray();
if(vm.isObject(vObject) && vm.isObject(vArray)) {
  // ...
}
```

- VM.prototype.isArray(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `array`。

```javascript
const vArray = vm.createArray();
if(vm.isArray(vArray)) {
  // ...
}
```

- VM.prototype.isFunction(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `function`。

```javascript
const vFunction = vm.createFunction("log", function(){});
if(vm.isFunction(vFunction)){
  // ...
}
```

- VM.prototype.isError(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `error`。

```javascript
const vError = vm.createError('unknown error');
if(vm.isError(vError)){
  // ...
}
```

- VM.prototype.isRegExp(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `regexp`。

```javascript
const vRegExp = vm.createRegExp("\\w+", "ig");
if(vm.isRegExp(vRegExp)){
  // ...
}
```

- VM.prototype.isDate(value)
  - value: Value
  - `return` Boolean

判断包装类型是否为 `date`。

```javascript
const vDate = vm.createDate();
if(vm.isDate(vDate)){
  // ...
}
```

- VM.prototype.asUndefined(value)
- value: Value
- `return` undefined

将 `undefined` 包装类型转换为普通的 `undefined` 值。

```javascript
const vUndefined = vm.createUndefined();
vm.asUndefined(vUndefined) === undefined;
```

- VM.prototype.asNull(value)
- value: Value
- `return` null

将 `null` 包装类型转换为普通的 `null` 值。

```javascript
const vNull = vm.createNull();
vm.asNull(vNull) === null;
```

- VM.prototype.asBoolean(value)
  - value: Value
  - `return` Boolean

将 `bool` 包装类型转换为普通的 `bool` 值。

```javascript
const vBoolean = vm.createBoolean(true);
const boolean = vm.asBoolean(vBoolean);
if(boolean === true) {
  // ...
}
```

- VM.prototype.asNumber(value)
  - value: Value
  - `return` Number

将 `number` 包装类型转换为普通的 `number` 值。

```javascript
const vNumber = vm.createNumber(1024);
const number = vm.asNumber(vNumber);
if(number === 1024) {
  // ...
}
```

- VM.prototype.asString(value)
  - value: Value
  - `return` String

将 `string` 包装类型转换为普通的 `string` 值。

```javascript
const vString = vm.createString('Hello World!');
const string = vm.asString(vString);
if(string === 'Hello World!') {
  // ...
}
```

- VM.prototype.asObject(value)
  - value: Value
  - `return` Object

将 `object` 包装类型转换为内部的 `object` 类型。

```javascript
const vObject = vm.createFunction("asObject", function(){});
const object = vm.asObject(vObject);
if(object.type === 12) {
  // ...
}
```

- VM.prototype.instanceof(lval, rval)
  - lval: Value
  - rval: Value
  - `return` Boolean

等价于 `instanceof` 关键字用法。

```javascript
const global = vm.getGlobal();
const vDateFunc = vm.getProperty(global, "Date");
const vDate = vm.createDate();
if(vm.instanceof(vDate, vDateFunc)) {
  // ...
}
```

- VM.prototype.typeof(value)
  - value: Value
  - `return` String

等价于 `typeof` 关键字用法。

```javascript
const vString = vm.createString('Hello World!');
if(vm.typeof(vString) === "string") {
  // ...
}
```

- VM.prototype.getProperty(value, name)
  - value: Value
  - name: String
  - `return` Value

获取一个对象的对应属性，其返回值是一个包装类型。

```javascript
const global = vm.getGlobal();
const vPrint = vm.getProperty(global, "print");
if(vm.isFunction(vPrint)) {
  // ...
}
```

- VM.prototype.setProperty(value, name, property)
  - value: Value
  - name: String
  - property: Value
  - `return` Value

设置一个对象的对应属性，其返回值是一个包装那类型。

```javascript
const global = vm.getGlobal();
const console = vm.createObject();
const log = vm.createFunction("log", function() {
  // console.log impl
});

vm.setProperty(console, "log", log);
vm.setProperty(global, "console", console);
```

- VM.prototype.deleteProperty(value, name)
  - value: Value
  - name: String
  - `return` Boolean

删除对象的对应属性。

```javascript
const global = vm.getGlobal();
vm.deleteProperty(global, "print");

const vPrint = vm.getProperty(global, "print");
if(vm.isUndefined(vPrint)) {
  // ...
} 
```

- VM.prototype.defineProperty(value, name, desc)
  - value: Value
  - name: String
  - desc: Object
  - `return` Value

等价于 `Object.defineProperty` 函数的用法。

```javascript
const vObject = vm.createObject();
vm.defineProperty(vObject, "name", { 
  value: vm.createString("sablejs"),
});

const getter = vm.createFunction("getter", functionn() {
  return vm.createNumber("101");
});

const setter = vm.createFunction("setter", function(age) {
  vm.setProperty(this, "__age__", age);
});

vm.defineProperty(vObject, "age", {
  enumerable: false,
  get: getter,
  set: setter,
});

```

- VM.prototype.getPrototype(value)
  - value: Value
  - `return` Value

获取一个对象的原型。

```javascript
const global = vm.getGlobal();
const vStringFunc = vm.getProperty(global, "String");
if(!vm.isUndefined(vStringFunc)) {
  const vTrimStart = vm.createFunction("trimStart", function() {
    const str = vm.asString(this);
    return vm.createString(str);
  });

  const vStringFuncProto = vm.getPrototype(vStringFunc);
  vm.setProperty(vStringFuncProto, "trimStart", vTrimStart);
}
```

- VM.prototype.setPrototype(value, prototype)
  - value: Value
  - prototype: Value
  - `return` Value

设置一个对象的原型。

```javascript
const vA = vm.createFunction("A", function() {});
const vObject = vm.createObject();

vm.setProperty(vObject, 'name', vm.createString('Hello World!'));
vm.setPrototype(vA, vObject);
```

- VM.prototype.throw(value)
  - value: Value
  - `return` undefined

等价于 `throw` 关键字。

```javascript
const vError = vm.createError('unknown error');
vm.throw(vError);
```

- VM.prototype.new(func[, arg1, arg2, arg3...])
  - func: Value
  - arg: Value
  - `return` Value

等价于 `new` 关键字。

```javascript
const vA = vm.createFunction('A', function(name) {
  vm.setProperty(this, 'name', name);
});

vm.new(vA, vm.createString("A"));
```

- VM.prototype.call(func, thisPtr[, arg1, arg2, arg3...])
  - func: Value
  - thisPtr: Value | undefined
  - arg: Value
  - `return` Value

等价于 `Function.prototype.call` 函数。

```javascript
const vLog = vm.createFunction('log', function() {
  const temp = [];
  for(let i = 0; i < arguments.length; i++){
    temp.push(vm.asString(arguments[i]));
  }
  console.log(...temp); // '1', 1, false
});

vm.call(
  vLog, 
  vm.createUndefined(), 
  vm.createString('1'), 
  vm.createNumber(1), 
  vm.createBoolean(false)
);
```

- VM.prototype.destroy
  - `return` undefined

销毁VM实例，释放内存。

```javascript
vm.destroy();
```

### 性能测试

sablejs也许是使用JavaScript编写的JavaScript引擎中最快的实现 ([测试用例使用 v8 benchmark suites](https://github.com/mozilla/arewefastyet/tree/master/benchmarks/v8-v7)):

> 性能测试环境:
>
> - Node.js v12.19.0
> - Golang 1.15.6
> - GCC 5.4.0 -O3
> - 2.4 GHz Intel Core i9
> - MacOS Mojave 10.14.6 (18G6032)

|               | sablejs    | sval       | eval5      | quickjs-wasm    | goja   |
| ------------- | ---------- | ---------- | ---------- | --------------- | ------ |
| Language      | JavaScript | JavaScript | JavaScript | C + WebAssembly | Golang |
| Richards      | 110        | 24.9       | 24.7       | 376             | 208    |
| Crypto        | 114        | 24.6       | 20.2       | 400             | 104    |
| RayTrace      | 258        | 92.2       | 98.5       | 471             | 294    |
| NavierStokes  | 183        | 35.9       | 49.8       | 665             | 191    |
| DeltaBlue     | 120        | 35.3       | 29.5       | 402             | 276    |
| Total score   | 148        | 37.3       | 37.3       | 452             | 202    |
| Baseline      | 1          | ▼ 2.96     | ▼ 2.96     | ▲ 2.05          | ▲ 0.36 |
| File Size(KB) | 216        | 152        | 134        | 434             | -      |
| Gzip Size(KB) | 29         | 40         | 34         | 245             | -      |

### 限制

1. eval及Function的动态执行部分在sablejs是被禁止的，但是如果你参数仅传递string/number/null及undefined的话，其是可以被正常执行的（因为解释器中不包含编译器，因此仅支持字面量的分析和传入）。

```javascript
eval("print('Hello World!')"); // it's ok
eval("var " + "a=1"); // it's ok

var str = "Hello World!";
eval("print('" + str + "')"); // throw SyntaxError

Function("a", "b", "return a+b"); // it's ok
new Function("a", "b", "return a+b"); // it's ok

var str = "return a+b";
Function("a", "b", str); // throw SyntaxError
new Function("a", "b", str); // throw SyntaxError
```

2. 浏览器环境中需要支持`btoa`、`unescape`、`decodeURIComponent`等原生函数，若果你想在IE9及以下使用，请自行添加相关的shims。

### 使用协议

sablejs JavaScript Engine

Copyright (c) 2020-2021 ErosZhao

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

Non-profit projects of individuals or organizations and commercial projects with
commercial authorization of the author.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
