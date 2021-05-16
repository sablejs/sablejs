const VM = require("../runtime")();
const fs = require("fs");

const vm = new VM();
const vGlobal = vm.getGlobal();
const vConsole = vm.createObject();
const vLog = vm.createFunction("log", function () {
  var temp = [];
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
