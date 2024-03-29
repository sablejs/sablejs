// Copyright 2011 the Sputnik authors.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/**
 * @path ch15/15.3/15.3.4/15.3.4.2/S15.3.4.2_A12.js
 * @description The Function.prototype.toString function is not generic; it throws a TypeError exception if its this value is not a Function object.
 * @negative TypeError
 */
try {
  Function.prototype.toString.call(undefined);
} catch (e) {
  if (!(e instanceof TypeError)) {
    throw e;
  }
}
