// Copyright 2009 the Sputnik authors.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/**
 * String.prototype.charCodeAt can't be used as constructor
 *
 * @path ch15/15.5/15.5.4/15.5.4.5/S15.5.4.5_A7.js
 * @description Checking if creating the String.prototype.charCodeAt object fails
 */

var __FACTORY = String.prototype.charCodeAt;

try {
  var __instance = new __FACTORY;
  $FAIL('#1: __FACTORY = String.prototype.charCodeAt; "__instance = new __FACTORY" lead to throwing exception');
} catch (e) {
    if (!(e instanceof TypeError)) throw e;
}

