/// Copyright (c) 2012 Ecma International.  All rights reserved. 
/// Ecma International makes this code available under the terms and conditions set
/// forth on http://hg.ecmascript.org/tests/test262/raw-file/tip/LICENSE (the 
/// "Use Terms").   Any redistribution of this code must retain the above 
/// copyright and this notice and otherwise comply with the Use Terms.

/**
 * @path ch10/10.6/10.6-2gs.js
 * @description Strict Mode - arguments.callee cannot be accessed in a strict function
 * @onlyStrict
 * @negative .
 */

"use strict";
function f_10_6_1_gs(){
    try{
        return arguments.callee;
    }catch(e){
        return e instanceof TypeError;
    }
}
f_10_6_1_gs();

