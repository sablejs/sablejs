/// Copyright (c) 2012 Ecma International.  All rights reserved. 
/// Ecma International makes this code available under the terms and conditions set
/// forth on http://hg.ecmascript.org/tests/test262/raw-file/tip/LICENSE (the 
/// "Use Terms").   Any redistribution of this code must retain the above 
/// copyright and this notice and otherwise comply with the Use Terms.
/**
 * @path ch11/11.13/11.13.2/11.13.2-5-s.js
 * @description Strict Mode - ReferenceError is thrown if the LeftHandSideExpression of a Compound Assignment operator(-=) evaluates to an unresolvable reference
 * @onlyStrict
 */


function testcase() {
        "use strict";
        try {
            eval("_11_13_2_5 -= 1;");
            return false;
        } catch (e) {
            return e instanceof SyntaxError;
        }
    }
runTestCase(testcase);
