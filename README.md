# sablejs
🏖️ The safer and faster ECMA5.1 interpreter written by JavaScript, it can be used:
1. Sandbox(like Figma Plugin Sandbox, but better and easy to use);
2. Mini Program/Game JavaScript dynamic execution;
3. Protect JavaScript source code via AOT compiling to opcode;

sablejs may be the fastest interpreter written by JavaScript ([using v8 benchmark suites](https://github.com/mozilla/arewefastyet/tree/master/benchmarks/v8-v7)):
* ~3.x slower than QuickJS WebAssembly;
* More than 3.x faster than sval, eval5;
* More than 8.x faster than js-interpreter, engine262, etc;

|     | sable.js  | sval  | eval5  | quickjs-wasm  | mujs  |
|  ----  | ----  | ----  | ----  | ----  | ----  |
| Language  | JavaScript | JavaScript | JavaScript | C + WebAssembly | C |
| Richards  | 83.1 | 26.4 | 20.8 | 348 | 187 |
| Richards  | 65.4 | 25.7 | 18.5 | 363 | 113 |
| Richards  | 209 | 90.8 | 75.5 | 475 | 392 |
| Richards  | 104 | 33.6 | 43.1 | 622 | 109 |
| Richards  | 268 | 319 | 190 | 1155 | 36.7 |
| Total score  | 126 | 58.1 | 47.4 | 534 | 167 |

and sablejs's file size is only ~50KB (with GZIP🥰).

**Current progress:**
1. Except for JSON, other logic has been completed
2. Test262 has been integrated, now covered ~60% cases

It will be coming soon...
