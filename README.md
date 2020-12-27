# sablejs
🏖️ The safer and faster ECMA5.1 interpreter written by JavaScript, it can be used:
1. Sandbox(like Figma Plugin Sandbox, but better and easy to use);
2. Mini Program/Game JavaScript dynamic execution;
3. Protect JavaScript source code via AOT compiling to opcode;

sablejs may be the fastest interpreter written by JavaScript ([using v8 benchmark suites](https://github.com/mozilla/arewefastyet/tree/master/benchmarks/v8-v7)):

> Benchmark Enviorment: 
> * Node.js v14.15.1
> * Golang 1.15.6
> * GCC 5.4.0 -O3
> * 2.4 GHz Intel Core i9
> * MacOS Mojave 10.14.6 (18G6032)

|     | sable.js  | sval  | eval5  | quickjs-wasm  | mujs  | otto | goja |
|  ----  | ----  | ----  | ----  | ----  | ----  | ----  | ----  |
| Language  | JavaScript | JavaScript | JavaScript | C + WebAssembly | C | Golang | Golang |
| Richards  | 118 | 26.9 | 17.9 | 399 | 187 | 19.4 | 211 |
| Crypto  | 120 | 24.1 | 17.5 | 478 | 113 | 15 | 106 |
| RayTrace  | 301 | 96.6 | 70.5 | 491 | 392 | 52.3 | 302 |
| NavierStokes  | 183 | 29.9 | 40.5 | 847 | 109 | 25.5 | 193 |
| Splay  | 450 | 374 | 296 | 1254 | 36.7 | 132 | 1065 |
| Total score  | 204 | 56.1 | 43.0 | 630 | 167 | 34.8 | 268 |
| Baseline  | 1 |  ▼ 2.63 | ▼ 3.74 | ▲ 2.08 | ▼ 0.23 | ▼ 4.86 | ▲ 0.31 |
| File Size(KB)  | 294 | 152 | 134 | 434 | - | - | - |
| Gzip Size(KB) | 43 | 40 | 34 | 245 | - | - | - |

**Current progress:**
1. Except for JSON, other logic has been completed
2. Test262 has been integrated, now covered ~70% cases

It will be coming soon...
