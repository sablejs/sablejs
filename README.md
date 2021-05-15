# sablejs

![linux ci](https://github.com/sablejs/sablejs/actions/workflows/linux.yml/badge.svg)
![osx ci](https://github.com/sablejs/sablejs/actions/workflows/osx.yml/badge.svg)
![windows ci](https://github.com/sablejs/sablejs/actions/workflows/win.yml/badge.svg)
<a href="https://www.npmjs.com/package/sablejs"><img src="https://img.shields.io/npm/v/sablejs.svg?sanitize=true" alt="Version"></a>

🏖️ The safer and faster ECMA5.1 interpreter written by JavaScript, it can be used:

1. Sandbox(like Figma Plugin Sandbox, but better and easy to use);
2. Mini Program/Game JavaScript dynamic execution;
3. Protect JavaScript source code via AOT compiling to opcode;

sablejs covered ~95% [test262 es5-tests cases](https://github.com/tc39/test262/tree/es5-tests), it can be safely used in production.

### Quick Start

**sablejs includes the Compiler and Interpreter independently**, so we removed the dynamic related api from the spec(see [Limits 1](https://github.com/sablejs/sablejs#limits)). In short, you need to compile your JavaScript code with sablejs cli before you run it.

#### Example

Suppose we have the following code in `input.js`:

```javascript
function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

print(fib(30));
```

#### Compile It!

```shell
> npm i sablejs -g
> sablejs -i input.js -o output # get output file that contains base64 string
```

sablejs cli includes the following commands:

```shell
Usage: sablejs [options]

Options:
  -v, --vers           output the current version
  -i, --input <path>   compile input filepath
  -o, --output <path>  compile output filepath
  -s, --slient         dont output log
  -h, --help
```

#### Run It!

```shell
> npm install sablejs --save
```

or you can import to your html directly

```html
<script src="https://cdn.jsdelivr.net/npm/sablejs@0.34.0/runtime.js"></script>
```

##### Browser

```javascript
const VM = require("sablejs/runtime")();
(async () => {
  const resp = await fetch("<output url>");
  const data = await resp.text();
  const vm = new VM();
  vm.run(data); // print 832040
  vm.destroy();
})();
```

##### Node

```javascript
const fs = require("fs");
const data = fs.readFileSync("<output filepath>").toString();
const VM = require("sablejs/runtime")();
const vm = new VM();
vm.run(data); // print 832040
vm.destroy();
```

### APIs

- VM.prototype.run(source)
  - source: String
  - `return:` undefined
- VM.prototype.getGlobal()
  - `return:` Value
- VM.prototype.createUndefined()
  - `return` Value
- VM.prototype.createNull()
  - `return:` Value
- VM.prototype.createBoolean(bool)
  - bool: Boolean
  - `return` Value
- VM.prototype.createNumber(num)
  - num: Number
  - `return` Value
- VM.prototype.createString(str)
  - str: String
  - `return` Value
- VM.prototype.createObject()
  - `return` Value
- VM.prototype.createArray(length)
  - length: Number | undefined
  - `return` Value
- VM.prototype.createFunction(name, func)
  - name: String
  - func: Function
  - `return` Value
- VM.prototype.createError(message)
  - message: String | undefined
  - `return` Value
- VM.prototype.createRegExp(pattern, flags)
  - pattern: String
  - flags: String | undefined
  - `return` Value
- VM.prototype.createDate()
  - `return` Value
- VM.prototype.isUndefined(value)
  - value: Value
  - `return` Boolean
- VM.prototype.isNull(value)
  - value: Value
  - `return` Boolean
- VM.prototype.isBoolean(value)
  - value: Value
  - `return` Boolean
- VM.prototype.isNumber(value)
  - value: Value
  - `return` Boolean
- VM.prototype.isString(value)
  - value: Value
  - `return` Boolean
- VM.prototype.isObject(value)
  - value: Value
  - `return` Boolean
- VM.prototype.isArray(value)
  - value: Value
  - `return` Boolean
- VM.prototype.isFunction(value)
  - value: Value
  - `return` Boolean
- VM.prototype.isError(value)
  - value: Value
  - `return` Boolean
- VM.prototype.isRegExp(value)
  - value: Value
  - `return` Boolean
- VM.prototype.isDate(value)
  - value: Value
  - `return` Boolean
- VM.prototype.asBoolean(value)
  - value: Value
  - `return` Boolean
- VM.prototype.asNumber(value)
  - value: Value
  - `return` Number
- VM.prototype.asString(value)
  - value: Value
  - `return` String
- VM.prototype.instanceof(lval, rval)
  - lval: Value
  - rval: Value
  - `return` Boolean
- VM.prototype.typeof(value)
  - value: Value
  - `return` String
- VM.prototype.getProperty(value, name)
  - value: Value
  - name: String
  - `return` Value
- VM.prototype.setProperty(value, name, property)
  - value: Value
  - name: String
  - property: Value
  - `return` Value
- VM.prototype.deleteProperty(value, name)
  - value: Value
  - name: String
  - `return` Boolean
- VM.prototype.defineProperty(value, name, desc)
  - value: Value
  - name: String
  - desc: Object
  - `return` Value
- VM.prototype.getPrototype(value)
  - value: Value
  - `return` Value
- VM.prototype.setPrototype(value, prototype)
  - value: Value
  - prototype: Value
  - `return` Value
- VM.prototype.throw(value)
  - value: Value
  - `return` undefined
- VM.prototype.new(func)
  - func: Value
  - `return` Value
- VM.prototype.call(func, thisPtr[, arg1, arg2, arg3...])
  - func: Value
  - thisPtr: Value | undefined
  - arg: Value
  - `return` Value
- VM.prototype.destroy
  - `return` undefined

### Benchmark

sablejs may be the fastest interpreter written by JavaScript ([using v8 benchmark suites](https://github.com/mozilla/arewefastyet/tree/master/benchmarks/v8-v7)):

> Benchmark Enviorment:
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
| File Size(KB) | 220        | 152        | 134        | 434             | -      |
| Gzip Size(KB) | 31         | 40         | 34         | 245             | -      |

### Limits

1. Dynamic execution of eval and Function is forbidden, but passing of literal string/number/null and undefined is allowed(the interpreter doesn't contain any compiler).

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

### License

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
