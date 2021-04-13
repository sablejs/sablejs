# sablejs

🏖️ The safer and faster ECMA5.1 interpreter written by JavaScript, it can be used:
1. Sandbox(like Figma Plugin Sandbox, but better and easy to use);
2. Mini Program/Game JavaScript dynamic execution;
3. Protect JavaScript source code via AOT compiling to opcode;

sablejs may be the fastest interpreter written by JavaScript ([using v8 benchmark suites](https://github.com/mozilla/arewefastyet/tree/master/benchmarks/v8-v7)):

> Benchmark Enviorment: 
> * Node.js v12.19.0
> * Golang 1.15.6
> * GCC 5.4.0 -O3
> * 2.4 GHz Intel Core i9
> * MacOS Mojave 10.14.6 (18G6032)

|     | sable.js  | sval  | eval5  | quickjs-wasm  | mujs  | otto | goja |
|  ----  | ----  | ----  | ----  | ----  | ----  | ----  | ----  |
| Language  | JavaScript | JavaScript | JavaScript | C + WebAssembly | C | Golang | Golang |
| Richards  | 112 | 29.4 | 25.1 | 347 | 187 | 23.4 | 210 |
| Crypto  | 120 | 28.8 | 21.4 | 412 | 113 | 19.2 | 107 |
| RayTrace  | 297 | 102 | 102 | 512 | 392 | 64.5 | 301 |
| NavierStokes  | 179 | 38.0 | 53.1 | 701 | 109 | 31.4 | 191 |
| Total score  | 164 | 42.5 | 41.3 | 476 | 173 | 30.9 | 190 |
| Baseline  | 1 |  ▼ 2.86 | ▼ 2.97 | ▲ 1.90 | ▲ 0.05 | ▼ 4.30 | ▲ 0.16 |
| File Size(KB)  | VM: 343 | 152 | 134 | 434 | - | - | - |
| Gzip Size(KB) | VM: 29 | 40 | 34 | 245 | - | - | - |

**Current progress:**
1. Test262 has been integrated, now covered ~80% cases.
2. Prod vm for open source after obfuscation, compiler closed source.

**Limits:**
1. Dynamic execution of eval and Function is forbidden, but passing of literal and undefined is allowed(the interpreter doesn't contain any compiler).
```javascript
eval("print('Hello World!')"); // it's ok
eval("var " + "a=1"); // it's ok

var str = "Hello World!";
eval("print('" + str +"')"); // throw SyntaxError

Function("a","b","return a+b"); // it's ok
new Function("a", "b", "return a+b") // it's ok

var str = "return a+b";
Function("a","b", str); // throw SyntaxError
new Function("a","b", str); // throw SyntaxError
```

It will be coming soon...
