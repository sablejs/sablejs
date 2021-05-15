const VM = require("../runtime")();
const fs = require("fs");

function __fib__(n) {
  return n < 2 ? n : __fib__(n - 1) + __fib__(n - 2);
}

const vm = new VM();
const global = vm.getGlobal();
const fib = vm.createFunction("fib", function (n) {
  n = vm.asNumber(n);
  return vm.createNumber(__fib__(n));
});

vm.setProperty(global, "fib", fib);

// please run: sablejs -i fib.js -o output
vm.run(fs.readFileSync("./output").toString());
