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
| Richards  | 118 | 26.0 | 24.5 | 347 | 187 | 23.6 | 211 |
| Crypto  | 120 | 28.2 | 21.9 | 414 | 113 | 19.3 | 106 |
| RayTrace  | 301 | 99.0 | 101 | 520 | 392 | 64.6 | 302 |
| NavierStokes  | 183 | 37.6 | 52.6 | 711 | 109 | 30.9 | 193 |
| Splay  | 450 | 312 | 236 | 1227 | 36.7 | 164 | 1065 |
| Total score  | 204 | 61.1 | 58.3 | 579 | 167 | 43.8 | 268 |
| Baseline  | 1 |  ▼ 2.33 | ▼ 2.49 | ▲ 1.83 | ▼ 0.23 | ▼ 3.65 | ▲ 0.31 |
| File Size(KB)  | 294 | 152 | 134 | 434 | - | - | - |
| Gzip Size(KB) | 43 | 40 | 34 | 245 | - | - | - |

**Current progress:**
1. Except for JSON, other logic has been completed
2. Test262 has been integrated, now covered ~70% cases

It will be coming soon...
