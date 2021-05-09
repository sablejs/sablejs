// Copyright 2009 the Sputnik authors.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/**
 * All of the arguments are optional, any arguments supplied are
 * accepted but are completely ignored. A string is created and returned as
 * if by the expression (new Date()).toString()
 *
 * @path ch15/15.9/15.9.2/S15.9.2.1_A2.js
 * @description Use various number arguments and various types of ones
 */

function dateIsEqual(d1, d2) {
  if (d1 === d2) {
    return true;
  } else if (Math.abs(Date.parse(d1) - Date.parse(d2)) <= 1000) {
    return true;
  } else { 
    return false;
  }
}

//CHECK#1
if( !dateIsEqual(Date(), (new Date()).toString()) ) {
  $ERROR('#1: Date() is equal to (new Date()).toString()');
}

//CHECK#2
if( !dateIsEqual(Date(1), (new Date()).toString()) ) {
  $ERROR('#2: Date(1) is equal to (new Date()).toString()');
}

//CHECK#3
if( !dateIsEqual(Date(1970, 1), (new Date()).toString()) ) {
  $ERROR('#3: Date(1970, 1) is equal to (new Date()).toString()');
}

//CHECK#4
if( !dateIsEqual(Date(1970, 1, 1), (new Date()).toString()) ) {
  $ERROR('#4: Date(1970, 1, 1) is equal to (new Date()).toString()');
}

//CHECK#5
if( !dateIsEqual(Date(1970, 1, 1, 1), (new Date()).toString()) ) {
  $ERROR('#5: Date(1970, 1, 1, 1) is equal to (new Date()).toString()');
}

//CHECK#6
if( !dateIsEqual(Date(1970, 1, 1, 1), (new Date()).toString()) ) {
  $ERROR('#7: Date(1970, 1, 1, 1) is equal to (new Date()).toString()');
}

//CHECK#8
if( !dateIsEqual(Date(1970, 1, 1, 1, 0), (new Date()).toString()) ) {
  $ERROR('#8: Date(1970, 1, 1, 1, 0) is equal to (new Date()).toString()');
}

//CHECK#9
if( !dateIsEqual(Date(1970, 1, 1, 1, 0, 0), (new Date()).toString()) ) {
  $ERROR('#9: Date(1970, 1, 1, 1, 0, 0) is equal to (new Date()).toString()');
}

//CHECK#10
if( !dateIsEqual(Date(1970, 1, 1, 1, 0, 0, 0), (new Date()).toString()) ) {
  $ERROR('#10: Date(1970, 1, 1, 1, 0, 0, 0) is equal to (new Date()).toString()');
}

//CHECK#11
if( !dateIsEqual(Date(Number.NaN), (new Date()).toString()) ) {
  $ERROR('#11: Date(Number.NaN) is equal to (new Date()).toString()');
}

//CHECK#12
if( !dateIsEqual(Date(Number.POSITIVE_INFINITY), (new Date()).toString()) ) {
  $ERROR('#12: Date(Number.POSITIVE_INFINITY) is equal to (new Date()).toString()');
}

//CHECK#13
if( !dateIsEqual(Date(Number.NEGATIVE_INFINITY), (new Date()).toString()) ) {
  $ERROR('#13: Date(Number.NEGATIVE_INFINITY) is equal to (new Date()).toString()');
}

//CHECK#14
if( !dateIsEqual(Date(undefined), (new Date()).toString()) ) {
  $ERROR('#14: Date(undefined) is equal to (new Date()).toString()');
}

//CHECK#15
if( !dateIsEqual(Date(null), (new Date()).toString()) ) {
  $ERROR('#15: Date(null) is equal to (new Date()).toString()');
}

