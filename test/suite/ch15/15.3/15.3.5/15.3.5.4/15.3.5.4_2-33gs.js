/// Copyright (c) 2012 Ecma International.  All rights reserved. 
/// Ecma International makes this code available under the terms and conditions set
/// forth on http://hg.ecmascript.org/tests/test262/raw-file/tip/LICENSE (the 
/// "Use Terms").   Any redistribution of this code must retain the above 
/// copyright and this notice and otherwise comply with the Use Terms.
/**
 * @path ch15/15.3/15.3.5/15.3.5.4/15.3.5.4_2-33gs.js
 * @description Strict mode - checking access to strict function caller from non-strict function (FunctionDeclaration defined within a FunctionExpression with a strict directive prologue)
 * @noStrict
 * @negative TypeError
 */


var f1 = function () {
    "use strict";
    function f() {
        return gNonStrict();
    }
    return f();
}
f1();


function gNonStrict() {
    return gNonStrict.caller;
}

