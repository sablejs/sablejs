const spawn = require("cross-spawn");
const chalk = require("chalk");
const os = require("os");
const fs = require("fs");
const VM = require("../runtime");
const vm = new (VM())();

function compile(codestr) {
  const ipath = `${os.tmpdir()}/sablejs.i.test.js`;
  const opath = `${os.tmpdir()}/sablejs.o.test.js`;
  fs.writeFileSync(ipath, codestr);
  fs.writeFileSync(opath, "");
  let { error, output } = spawn.sync("node", [__dirname + "/../cli.js", "-i", ipath, "-o", opath]);
  if (error) {
    console.log(chalk.red(error));
    process.exit(1);
  }

  output = Buffer.concat(output.filter((v) => !!v));
  output = output.toString().trim();
  if (/^\[ERROR\]/.test(output)) {
    throw output;
  } else {
    return fs.readFileSync(opath).toString();
  }
}

(async () => {
  let codestr = fs.readFileSync(__dirname + "/benchmark.js").toString();
  codestr = await compile(codestr);
  vm.run(codestr);
  vm.destroy();
})();
