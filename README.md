# sablejs
🏖️ The safer and faster ECMA5.1 interpreter written by JavaScript, it can be used:
1. Sandbox(like Figma Plugin Sandbox, but better and easy to use);
2. Mini Program/Game JavaScript dynamic execution;
3. Protect JavaScript source code via AOT compiling to opcode;

sablejs may be the fastest interpreter written by JavaScript ([using v8 benchmark suites](https://github.com/mozilla/arewefastyet/tree/master/benchmarks/v8-v7)):

> Benchmark enviorment: node.js v14.14.0 / AMD Ryzen5 3600 3.6GHz / Windows10

|     | sable.js  | sval  | eval5  | quickjs-wasm  | mujs  | otto
|  ----  | ----  | ----  | ----  | ----  | ----  | ----  |
| Language  | JavaScript | JavaScript | JavaScript | C + WebAssembly | C | Golang |
| Richards  | 86.4 | 26.4 | 17.9 | 406 | 187 | 19.4 |
| Crypto  | 70.5 | 25.7 | 17.5 | 476 | 113 | 15 |
| RayTrace  | 232 | 88.6 | 70.5 | 462 | 392 | 52.3 |
| NavierStokes  | 121 | 31.1 | 40.5 | 833 | 109 | 25.5 |
| Splay  | 374 | 319 | 284 | 1265 | 36.7 | 132 |
| Total score  | 145 | 54.2 | 43.0 | 623 | 167 | 34.8 |
| Baseline  | 1 |  ▼ 1.67 | ▼ 2.37 | ▲ 3.29 | ▲ 0.15 | ▼ 3.16 |
| File Size(KB)  | 210 | 152 | 134 | 434 | - | - |
| Gzip Size(KB) | 54 | 40 | 34 | 245 | - | - |

**Current progress:**
1. Except for JSON, other logic has been completed
2. Test262 has been integrated, now covered ~70% cases

It will be coming soon...
