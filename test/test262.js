const fs = require("fs");
const os = require("os");
const path = require("path");
const walkdir = require("walkdir");
const isdir = require("isdir");
const chalk = require("chalk");
const VM = require("../runtime");
const spawn = require("cross-spawn");
let { excludeCases, compileErrorCases } = require("./whitelist");

const folds = [
  "./suite/ch06/",
  "./suite/ch07/7.2/",
  "./suite/ch07/7.3/",
  "./suite/ch07/7.4/",
  "./suite/ch07/7.6/",
  "./suite/ch07/7.7",
  "./suite/ch07/7.8",
  "./suite/ch07/7.9",
  "./suite/ch08/8.1",
  "./suite/ch08/8.2",
  "./suite/ch08/8.3",
  "./suite/ch08/8.4",
  "./suite/ch08/8.5",
  "./suite/ch08/8.6",
  "./suite/ch08/8.7",
  "./suite/ch08/8.8",
  "./suite/ch08/8.12",
  "./suite/ch09/9.1",
  "./suite/ch09/9.2",
  "./suite/ch09/9.3",
  "./suite/ch09/9.4",
  "./suite/ch09/9.5",
  "./suite/ch09/9.6",
  "./suite/ch09/9.7",
  "./suite/ch09/9.8",
  "./suite/ch09/9.9",
  "./suite/ch10/10.1",
  "./suite/ch10/10.2",
  "./suite/ch10/10.4",
  "./suite/ch10/10.5",
  "./suite/ch10/10.6",
  "./suite/ch11/11.1",
  "./suite/ch11/11.2",
  "./suite/ch11/11.3",
  "./suite/ch11/11.4",
  "./suite/ch11/11.5",
  "./suite/ch11/11.7",
  "./suite/ch11/11.8",
  "./suite/ch11/11.9",
  "./suite/ch11/11.10",
  "./suite/ch11/11.11",
  "./suite/ch11/11.12",
  "./suite/ch11/11.13",
  "./suite/ch11/11.14",
  "./suite/ch12/12.1",
  "./suite/ch12/12.2",
  "./suite/ch12/12.3",
  "./suite/ch12/12.4",
  "./suite/ch12/12.5",
  "./suite/ch12/12.6",
  "./suite/ch12/12.7",
  "./suite/ch12/12.8",
  "./suite/ch12/12.9",
  "./suite/ch12/12.10",
  "./suite/ch12/12.11",
  "./suite/ch12/12.12",
  "./suite/ch12/12.13",
  "./suite/ch12/12.14",
  "./suite/ch13/13.0",
  "./suite/ch13/13.1",
  "./suite/ch13/13.2",
  "./suite/ch14/14.0",
  "./suite/ch14/14.1",
  "./suite/ch15/15.1",
  "./suite/ch15/15.2",
  "./suite/ch15/15.3",
  "./suite/ch15/15.4",
  "./suite/ch15/15.5",
  "./suite/ch15/15.6",
  "./suite/ch15/15.7",
  "./suite/ch15/15.8",
  "./suite/ch15/15.9",
  "./suite/ch15/15.10",
  "./suite/ch15/15.11",
  "./suite/ch15/15.12",
  "./suite/annexB",
  "./suite/bestPractice",
].map((v) => path.resolve(v));

compileErrorCases = compileErrorCases.map((v) => path.resolve(v));
excludeCases = excludeCases.map((v) => path.resolve(v));

const helper = `
var date_1899_end = -2208988800001;
var date_1900_start = -2208988800000;
var date_1969_end = -1;
var date_1970_start = 0;
var date_1999_end = 946684799999;
var date_2000_start = 946684800000;
var date_2099_end = 4102444799999;
var date_2100_start = 4102444800000;

var start_of_time = -8.64e15;
var end_of_time = 8.64e15;

var NotEarlyError = new Error("NotEarlyError");

function getPrecision(num)
{
	//TODO: Create a table of prec's,
	//      because using Math for testing Math isn't that correct. 
	
	log2num = Math.log(Math.abs(num))/Math.LN2;
	pernum = Math.ceil(log2num);
	return(2 * Math.pow(2, -52 + pernum));
	//return(0);
}

var prec;
function isEqual(num1, num2)
{
        if ((num1 === Infinity)&&(num2 === Infinity))
        {
                return(true);
        }
        if ((num1 === -Infinity)&&(num2 === -Infinity))
        {
                return(true);
        }
        prec = getPrecision(Math.min(Math.abs(num1), Math.abs(num2)));  
        return(Math.abs(num1 - num2) <= prec);
        //return(num1 === num2);
}

function fnExists(/*arguments*/) {
  for (var i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] !== "function") return false;
  }
  return true;
}

function fnGlobalObject() {
  return Function("return this;")();
}

var __globalObject = fnGlobalObject();

function arrayContains(array, subArray) {
  var found;
  for (var i = 0; i < subArray.length; i++) {
    found = false;
    for (var j = 0; j < array.length; j++) {
      if (subArray[i] === array[j]) {
        found = true;
        break;
      }
    }
    if (!found) {
      return false;
    }
  }
  return true;
}

function compareArray(aExpected, aActual) {
  if (aActual.length != aExpected.length) {
    return false;
  }

  aExpected.sort();
  aActual.sort();

  var s;
  for (var i = 0; i < aExpected.length; i++) {
    if (aActual[i] !== aExpected[i]) {
      return false;
    }
  }
  return true;
}

function dataPropertyAttributesAreCorrect(obj, name, value, writable, enumerable, configurable) {
  var attributesCorrect = true;

  if (obj[name] !== value) {
    if (typeof obj[name] === "number" && isNaN(obj[name]) && typeof value === "number" && isNaN(value)) {
      // keep empty
    } else {
      attributesCorrect = false;
    }
  }

  try {
    if (obj[name] === "oldValue") {
      obj[name] = "newValue";
    } else {
      obj[name] = "OldValue";
    }
  } catch (we) {}

  var overwrited = false;
  if (obj[name] !== value) {
    if (typeof obj[name] === "number" && isNaN(obj[name]) && typeof value === "number" && isNaN(value)) {
      // keep empty
    } else {
      overwrited = true;
    }
  }
  if (overwrited !== writable) {
    attributesCorrect = false;
  }

  var enumerated = false;
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop) && prop === name) {
      enumerated = true;
    }
  }

  if (enumerated !== enumerable) {
    attributesCorrect = false;
  }

  var deleted = false;

  try {
    delete obj[name];
  } catch (de) {}
  if (!obj.hasOwnProperty(name)) {
    deleted = true;
  }
  if (deleted !== configurable) {
    attributesCorrect = false;
  }

  return attributesCorrect;
}

function accessorPropertyAttributesAreCorrect(obj, name, get, set, setVerifyHelpProp, enumerable, configurable) {
  var attributesCorrect = true;

  if (get !== undefined) {
    if (obj[name] !== get()) {
      if (typeof obj[name] === "number" && isNaN(obj[name]) && typeof get() === "number" && isNaN(get())) {
        // keep empty
      } else {
        attributesCorrect = false;
      }
    }
  } else {
    if (obj[name] !== undefined) {
      attributesCorrect = false;
    }
  }

  try {
    var desc = Object.getOwnPropertyDescriptor(obj, name);
    if (typeof desc.set === "undefined") {
      if (typeof set !== "undefined") {
        attributesCorrect = false;
      }
    } else {
      obj[name] = "toBeSetValue";
      if (obj[setVerifyHelpProp] !== "toBeSetValue") {
        attributesCorrect = false;
      }
    }
  } catch (se) {
    throw se;
  }

  var enumerated = false;
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop) && prop === name) {
      enumerated = true;
    }
  }

  if (enumerated !== enumerable) {
    attributesCorrect = false;
  }

  var deleted = false;
  try {
    delete obj[name];
  } catch (de) {
    throw de;
  }
  if (!obj.hasOwnProperty(name)) {
    deleted = true;
  }
  if (deleted !== configurable) {
    attributesCorrect = false;
  }

  return attributesCorrect;
}

function $INCLUDE(){}

function $ERROR(msg) {
  throw msg;
}

function $FAIL(msg) {
  throw msg;
}

function $PRINT(msg) {
  // nothing to do...
}

function runTestCase(fn) {
  if (!fn()) $ERROR("test failed");
}
`;

function isUseStirct(data) {
  data = data
    .replace(/\/\/.+?\r?\n/g, "")
    .replace(/\/\*[\s\S]+?\*\/\r?\n/g, "")
    .replace(/\s+/, "");

  return /^["']use strict/.test(data);
}

function compile(codestr) {
  const ipath = `${os.tmpdir()}/sablejs.i.test.js`;
  const opath = `${os.tmpdir()}/sablejs.o.test.js`;
  fs.writeFileSync(ipath, codestr);
  fs.writeFileSync(opath, "");
  let { error, output } = spawn.sync("node", [__dirname + "/../cli.js", "--json", "-i", ipath, "-o", opath]);
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

function runCompileTest(path) {
  const data = fs.readFileSync(path).toString("utf-8");
  try {
    compile(`
      ${isUseStirct(data) ? '"use strict";' : ""};
      ${helper};
      ${data};
    `);
    console.log(chalk.red("[COMPILE]: " + e + " on: " + path));
    process.exit(1);
  } catch (e) {
    console.log(chalk.green(`[COMPILE]: ` + path));
  }
}

function runVMTest(path) {
  const data = fs.readFileSync(path).toString("utf-8");
  const vm = new (VM())();
  try {
    const codestr = compile(`
      ${isUseStirct(data) ? '"use strict";' : ""};
      ${helper};
      ${data};
    `);
    vm.run(codestr, true);
    vm.destroy();
    console.log(chalk.green(`[RUNTIME]: ` + path));
  } catch (e) {
    console.log(chalk.red("[RUNTIME]: " + e + " on: " + path));
    process.exit(1);
  }
}

const timestamp = +new Date();
for (let i = 0; i < folds.length; i++) {
  const paths = walkdir.sync(folds[i]);
  for (let j = 0; j < paths.length; j++) {
    const filepath = path.resolve(paths[j]);
    if (!isdir(filepath)) {
      const isCompileTest = compileErrorCases.some((v) => filepath.startsWith(v));
      if (isCompileTest) {
        runCompileTest(filepath);
      } else {
        const isExcluded = excludeCases.some((v) => filepath.startsWith(v));
        if (!isExcluded) {
          runVMTest(filepath);
        }
      }
    }
  }
}
console.log(chalk.green(`All cases passed: ${new Date() - timestamp}ms`));
