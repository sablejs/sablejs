const assert = require("assert");
const VM = require("../runtime.js");
let vm = null;

beforeEach(function() {
  vm = new (VM())();
});

afterEach(function() {
  vm.destroy();
});

describe("#getGlobal()", function() {
  it("should return global boxed value", function() {
    const global = vm.getGlobal();
    assert(!!global);
  });
});

describe("#createUndefined()", function() {
  it("should return undefiend boxed value", function() {
    const vUndefined = vm.createUndefined();
    assert(!!vUndefined);
  });
});

describe("#createNull()", function() {
  it("should return null boxed value", function() {
    const vNull = vm.createNull();
    assert(!!vNull);
  });
});

describe("#createNull()", function() {
  it("should return boolean boxed value", function() {
    let vBoolean = vm.createBoolean(true);
    assert(!!vBoolean);

    vBoolean = vm.createBoolean(false);
    assert(!!vBoolean);

    vBoolean = vm.createBoolean("Hello World!");
    assert(!!vBoolean);
  });
});

describe("#createNumber()", function() {
  it("should return number boxed value", function() {
    const vNumber = vm.createNumber(1024);
    assert(!!vNumber);
  });
});

describe("#createString()", function() {
  it("should return string boxed value", function() {
    const vString = vm.createString("Hello World!");
    assert(!!vString);
  });
});

describe("#createObject()", function() {
  it("should return object boxed value", function() {
    const vObject = vm.createObject();
    assert(!!vObject);
  });
});

describe("#createArray()", function() {
  it("should return object boxed value", function() {
    let vArray = vm.createArray();
    assert(!!vArray);
    assert.equal(vArray.value.properties.length, 0);

    vArray = vm.createArray(10);
    assert(!!vArray);
    assert.equal(vArray.value.properties.length, 10);
  });
});

describe("#createFunction()", function() {
  it("should return funcntion boxed value", function() {
    const vFuncntion = vm.createFunction("func", function() {});
    assert(!!vFuncntion);
  });
});

describe("#createError()", function() {
  it("should return error boxed value", function() {
    let vError = vm.createError();
    assert(!!vError);

    vError = vm.createError("unknown error");
    assert(!!vError);
    assert(!!vError.value.properties.message);
  });
});

describe("#createRegExp()", function() {
  it("should return regexp boxed value", function() {
    const vRegExp = vm.createRegExp("\\w+", "ig");
    assert(!!vRegExp);
    assert.equal(vRegExp.value.value.source, "\\w+");
  });
});

describe("#createDate()", function() {
  it("should return date boxed value", function() {
    const vDate = vm.createDate();
    assert(!!vDate);
    assert(!!vDate.value.value);
  });
});

describe("#isUndefined()", function() {
  it("only undefined boxed type should return true", function() {
    const vUndefined = vm.createUndefined();
    const vDate = vm.createDate();
    assert(vm.isUndefined(vUndefined));
    assert(!vm.isUndefined(vDate));
  });
});

describe("#isNull()", function() {
  it("only null boxed type should return true", function() {
    const vNull = vm.createNull();
    const vDate = vm.createDate();
    assert(vm.isNull(vNull));
    assert(!vm.isNull(vDate));
  });
});

describe("#isBoolean()", function() {
  it("only boolean boxed type should return true", function() {
    const vBoolean = vm.createBoolean(true);
    const vDate = vm.createDate();
    assert(vm.isBoolean(vBoolean));
    assert(!vm.isBoolean(vDate));
  });
});

describe("#isNumber()", function() {
  it("only boolean boxed type should return true", function() {
    const vNumber = vm.createNumber(1024);
    const vDate = vm.createDate();
    assert(vm.isNumber(vNumber));
    assert(!vm.isNumber(vDate));
  });
});

describe("#isString()", function() {
  it("only strinng boxed type should return true", function() {
    const vString = vm.createString("Hello World!");
    const vDate = vm.createDate();
    assert(vm.isString(vString));
    assert(!vm.isString(vDate));
  });
});

describe("#isObject()", function() {
  it("object boxed types should return true", function() {
    const vObject = vm.createObject();
    const vNumber = vm.createNumber(1024);
    assert(vm.isObject(vObject));
    assert(!vm.isObject(vNumber));
  });
});

describe("#isObject()", function() {
  it("only array boxed type should return true", function() {
    const vArray = vm.createArray();
    const vObject = vm.createObject();
    assert(vm.isObject(vArray));
    assert(vm.isArray(vArray));
    assert(!vm.isArray(vObject));
  });
});

describe("#isFunction()", function() {
  it("only funcntion boxed type should return true", function() {
    const vFunction = vm.createFunction("log", function() {});
    const vObject = vm.createObject();
    assert(vm.isObject(vFunction));
    assert(vm.isFunction(vFunction));
    assert(!vm.isFunction(vObject));
  });
});

describe("#isError()", function() {
  it("only error boxed type should return true", function() {
    const vError = vm.createError("unknown error");
    const vObject = vm.createObject();
    assert(vm.isObject(vError));
    assert(vm.isError(vError));
    assert(!vm.isError(vObject));
  });
});

describe("#isRegExp()", function() {
  it("only regexp boxed type should return true", function() {
    const vRegExp = vm.createRegExp("\\w+", "ig");
    const vObject = vm.createObject();
    assert(vm.isObject(vRegExp));
    assert(vm.isRegExp(vRegExp));
    assert(!vm.isRegExp(vObject));
  });
});

describe("#isDate()", function() {
  it("only date boxed type should return true", function() {
    const vDate = vm.createDate();
    const vObject = vm.createObject();
    assert(vm.isObject(vDate));
    assert(vm.isDate(vDate));
    assert(!vm.isDate(vObject));
  });
});

describe("#asUndefined()", function() {
  it("should return plain undefined", function() {
    const vUndefined = vm.createUndefined();
    assert(vm.asUndefined(vUndefined) === undefined);
  });
});

describe("#asNull()", function() {
  it("should return plain null", function() {
    const vNull = vm.createNull();
    assert(vm.asNull(vNull) === null);
  });
});

describe("#asBoolean()", function() {
  it("should return plain boolean", function() {
    const vBoolean = vm.createBoolean(true);
    const boolean = vm.asBoolean(vBoolean);
    assert(boolean);
  });
});

describe("#asNumber()", function() {
  it("should return plain number", function() {
    const vNumber = vm.createNumber(1024);
    const number = vm.asNumber(vNumber);
    assert(number === 1024);
  });
});

describe("#asString()", function() {
  it("should return plain string", function() {
    const vString = vm.createString("Hello World!");
    const string = vm.asString(vString);
    assert(string === "Hello World!");
  });
});

describe("#asObject()", function() {
  it("should return object", function() {
    const vObject = vm.createFunction("asObject", function() {});
    const object = vm.asObject(vObject);
    assert(object.type === 12);
  });
});

describe("#instanceof()", function() {
  it("instanceof should work", function() {
    const global = vm.getGlobal();
    const vDateFunc = vm.getProperty(global, "Date");
    const vDate = vm.createDate();
    assert(vm.instanceof(vDate, vDateFunc));
  });
});

describe("#typeof()", function() {
  it("typeof should work", function() {
    const vUndefined = vm.createUndefined();
    const vNull = vm.createNull();
    const vNumber = vm.createNumber(1024);
    const vBoolean = vm.createBoolean(false);
    const vString = vm.createString("Hello World!");
    const vObject = vm.createObject();
    assert.equal(vm.typeof(vUndefined), "undefined");
    assert.equal(vm.typeof(vNull), "object");
    assert.equal(vm.typeof(vNumber), "number");
    assert.equal(vm.typeof(vBoolean), "boolean");
    assert.equal(vm.typeof(vString), "string");
    assert.equal(vm.typeof(vObject), "object");
  });
});

describe("#getProperty()", function() {
  it("return should be a property boxed type.", function() {
    const global = vm.getGlobal();
    const vPrint = vm.getProperty(global, "print");
    assert(vm.isFunction(vPrint));
  });
});

describe("#setProperty()", function() {
  it("object set prototype should work.", function() {
    const global = vm.getGlobal();
    const console = vm.createObject();
    const log = vm.createFunction("log", function() {});

    vm.setProperty(console, "log", log);
    vm.setProperty(global, "console", console);

    const vObject = vm.getProperty(global, "console");
    const vFunction = vm.getProperty(vObject, "log");
    assert(vm.isObject(vObject));
    assert(vm.isFunction(vFunction));
  });

  it("array set prototype should work.", function() {
    const array = vm.createArray();
    vm.setProperty(array, 0, vm.createString("Hello World!"));
    vm.setProperty(array, 1, vm.createBoolean(false));
    vm.setProperty(array, 2, vm.createNumber(1024));

    assert(vm.isString(vm.getProperty(array, 0)));
    assert(vm.isBoolean(vm.getProperty(array, 1)));
    assert(vm.isNumber(vm.getProperty(array, 2)));
    assert.equal(vm.asString(vm.getProperty(array, 0)), "Hello World!");
    assert.equal(vm.asBoolean(vm.getProperty(array, 1)), false);
    assert.equal(vm.asNumber(vm.getProperty(array, 2)), 1024);
  });
});

describe("#defineProperty()", function() {
  it("delete property should work.", function() {
    const global = vm.getGlobal();
    vm.deleteProperty(global, "print");

    const vPrint = vm.getProperty(global, "print");
    assert(vm.isUndefined(vPrint));
  });
});

describe("#getPrototype()", function() {
  it("get prototype should work.", function() {
    const global = vm.getGlobal();
    const vStringFunc = vm.getProperty(global, "String");
    if (!vm.isUndefined(vStringFunc)) {
      const vTrimStart = vm.createFunction("trimStart", function() {
        const str = vm.asString(this);
        return vm.createString(str);
      });

      const vStringFuncProto = vm.getPrototype(vStringFunc);
      vm.setProperty(vStringFuncProto, "trimStart", vTrimStart);

      const proto = vm.getProperty(vStringFunc, "prototype");
      const func = vm.getProperty(proto, "trimStart");
      assert(vm.isFunction(func));
    }
  });
});

describe("#setPrototype()", function() {
  it("set prototype should work.", function() {
    const vA = vm.createFunction("A", function() {});
    const vArray = vm.createArray();

    vm.setProperty(vArray, 0, vm.createString("Hello World!"));
    vm.setPrototype(vA, vArray);

    const proto = vm.getPrototype(vA);
    assert(vm.isArray(proto));
  });
});

describe("#throw()", function() {
  it("throw should work.", function() {
    try {
      const vError = vm.createError("unknown error");
      vm.throw(vError);
    } catch (e) {
      assert(e instanceof Error);
    }
  });
});

describe("#new()", function() {
  it("new should work.", function() {
    const vA = vm.createFunction("A", function(name) {
      vm.setProperty(this, "name", name);
    });

    const vObject = vm.createObject();
    vm.setProperty(vObject, "age", vm.createNumber(101));
    vm.setPrototype(vA, vObject);

    const vAInstance = vm.new(vA, vm.createString("A"));
    const vName = vm.getProperty(vAInstance, "name");
    const vAge = vm.getProperty(vAInstance, "age");
    assert(vm.isString(vName));
    assert.equal(vm.asString(vName), "A");
    assert.equal(vm.asNumber(vAge), 101);
  });
});

describe("#call()", function() {
  it("call should work.", function() {
    const vConcat = vm.createFunction("concat", function() {
      const temp = [];
      for (let i = 0; i < arguments.length; i++) {
        temp.push(vm.asString(arguments[i]));
      }
      return vm.createString(temp.join(""));
    });

    const vConcatStr = vm.call(
      vConcat,
      vm.createUndefined(),
      vm.createString("1"),
      vm.createNumber(1),
      vm.createBoolean(false)
    );

    assert(vm.isString(vConcatStr));
    assert.equal(vm.asString(vConcatStr), "11false");
  });
});
