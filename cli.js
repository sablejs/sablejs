const { program } = require("commander");
const chalk = require("chalk");
const Downloader = require("nodejs-file-downloader");
const spawn = require("cross-spawn");
var { terminal } = require("terminal-kit");
const fs = require("fs");
const path = require("path");

const ARCH = process.arch;
const VERSION = require("./package.json").version;
const DOWNLOAD_PREFIX_URL = `https://github.com/sablejs/sablejs/releases/download/v${VERSION}/`;
const PLATFORM = {
  win32: "win",
  darwin: "osx",
  linux: "linux",
};

program
  .version(VERSION, "-v, --vers", "output the current version")
  .option("-i, --input <path>", "compile input filepath")
  .option("-o, --output <path>", "compile output filepath")
  .option("-j  --json", "don't do base64 compress, output simple json result")
  .option("-s, --slient", "don't output log")
  .parse(process.argv);

const args = program.args;
const opts = program.opts();
function log(str) {
  if (!opts.slient) {
    console.log(str);
  }
}

let ipath = args[0] || opts.input;
let opath = opts.output || "./output";
if (!ipath) {
  log(chalk.red(`[ERROR] input filepath missing: sablejs <input filepath> [-o <output filepath>]`));
  process.exit(1);
}

if (!fs.existsSync(ipath)) {
  log(chalk.red(`[ERROR] input file not exists: ${ipath}`));
  process.exit(1);
}

ipath = path.resolve(ipath);
opath = path.resolve(opath);

(async () => {
  const pkgpath = path.resolve(__dirname, "./.pkg");
  const platform = PLATFORM[process.platform];
  if (!platform) {
    log(chalk.red(`[ERROR] not support platform: ${platform}`));
    process.exit(1);
  }

  const filename = `sablejs-${platform}-${ARCH}`;
  let binpath = `${pkgpath}/${filename}`;
  binpath = platform === "win" ? `${binpath}.exe` : binpath;
  if (!fs.existsSync(binpath)) {
    if (!fs.existsSync(pkgpath)) {
      fs.mkdirSync(pkgpath);
    }

    log(chalk.green(`[INFO] start download compiler: ${filename}...`));
    const progressBar = terminal.progressBar({
      width: 80,
      title: "[INFO] download progress:",
      titleStyle: terminal.green,
      percent: true,
    });

    const downloader = new Downloader({
      url: `${DOWNLOAD_PREFIX_URL}${filename}`,
      directory: pkgpath,
      maxAttempts: 3,
      fileName: platform === "win" ? `${filename}.exe` : filename,
      onProgress: (percentage) => {
        progressBar.update(percentage / 100);
        if (percentage >= 100) {
          terminal("\n");
        }
      },
    });

    try {
      await downloader.download();
      fs.chmodSync(binpath, 0777);
    } catch (e) {
      console.log(chalk.red(`[ERROR] download failed: ${e.message}`));
      process.exit(1);
    }
  }

  let { error, output } = spawn.sync(binpath, [opts.json ? "-s" : "", "-i", ipath, "-o", opath]);
  if (error) {
    log(chalk.red(error));
    process.exit(1);
  }

  output = Buffer.concat(output.filter((v) => !!v));
  output = output.toString().trim();
  if (/^\[ERROR\]/.test(output)) {
    log(chalk.red(output));
    process.exit(1);
  } else {
    log(chalk.green(output));
    process.exit(0);
  }
})();
