// Copyright 2011 the Sputnik authors.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/**
 * @path ch15/15.3/15.3.4/15.3.4.3/S15.3.4.3_A13.js
 * @description If IsCallable(func) is false, then throw a TypeError exception.
 * @negative TypeError
 */

try {
  Function.prototype.apply.call(undefined, {}, []);
} catch (e) {
  if (!(e instanceof TypeError)) {
    throw e;
  }
}
