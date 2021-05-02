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

|     | sable.js  | sval  | eval5  | quickjs-wasm  | goja |
|  ----  | ----  | ----  | ----  | ----  |  ----  |
| Language  | JavaScript | JavaScript | JavaScript | C + WebAssembly | Golang |
| Richards  | 110 | 24.9 | 24.7 | 376 |  208 |
| Crypto  | 114 | 24.6 | 20.2 | 400 | 104 |
| RayTrace  | 258 | 92.2 | 98.5 | 471 |  294 |
| NavierStokes  | 183 | 35.9 | 49.8 | 665 |  191 |
| DeltaBlue  | 120 | 35.3 | 29.5 | 402 |  276 |
| Total score  | 148 | 37.3 | 37.3 | 452 | 202 |
| Baseline  | 1 |  ▼ 2.96 | ▼ 2.96 | ▲ 2.05 | ▲ 0.36 |
| File Size(KB)  | 198 | 152 | 134 | 434 | - | - | - |
| Gzip Size(KB) | 27 | 40 | 34 | 245 | - | - | - |

**Current progress:**
1. Test262 has been integrated, now covered ~95% cases.
2. Prod vm for open source after obfuscation, compiler closed source.

**Limits:**
1. Dynamic execution of eval and Function is forbidden, but passing of literal string/number/null and undefined is allowed(the interpreter doesn't contain any compiler).
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
