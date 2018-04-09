/*
	Neurons Kit

	Copyright (c) 2015 - 2018 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



/* Transfer functions */



exports.step = function( x ) { return x >= 0 ? 1 : 0 ; } ;
// The step function has no inverse... But we will fake that somewhat
exports.step.inverse = function( x ) { return x > 0.5 ? 0.5 : -0.5 ; } ;

exports.linear = function( x ) { return x ; } ;
exports.linear.inverse = exports.linear ;

exports.rectifier = function( x ) { return Math.max( 0 , x ) ; } ;
// The rectifier function has no inverse... But we will fake that somewhat
exports.rectifier.inverse = function( x ) { return x > 0 ? x : -0.5 ; } ;
exports.relu = exports.rectifier ;

exports.leakyRectifier = function( x ) { return x >= 0 ? x : 0.01 * x ; } ;
exports.leakyRectifier.inverse = function( x ) { return x >= 0 ? x : 100 * x ; } ;
exports.leakyRelu ;

exports.softPlus = function( x ) { return Math.log( 1 + Math.exp( x ) ) ; } ;
exports.softPlus.inverse = function( x ) { return Math.log( Math.exp( x ) - 1 ) ; } ;

// Sigmoid logistic
exports.logistic = function( x ) { return 1 / ( 1 + Math.exp( -x ) ) ; } ;
// The inverse is actually the 'logit' function
exports.logistic.inverse = function( x ) { return Math.log( x / ( 1 - x ) ) ; } ;

