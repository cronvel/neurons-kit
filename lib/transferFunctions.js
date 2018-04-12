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



const SLIPPY_FACTOR = 0.05 ;



/* Transfer functions */

// Step/Heaviside function
exports.step = exports.heaviside = x => x > 0 ? 1 : 0 ;

// Linear/identity function, probably useless
exports.linear = x => x ;

// Rectified linear function (relu)
exports.rectifier = exports.relu = x => x > 0 ? x : 0 ;

// SoftPlus function
exports.softPlus = x => Math.log( 1 + Math.exp( x ) ) ;

// Harder softPlus, good for closer rectifier approximation
exports.softPlus.hard = x => 0.25 * Math.log( 1 + Math.exp( 4 * x ) ) ;

// Sigmoid / Logistic
exports.sigmoid = exports.logistic = x => 1 / ( 1 + Math.exp( -x ) ) ;

// Harder Sigmoid, good for Heaviside approximation
exports.sigmoid.hard = x => 1 / ( 1 + Math.exp( -4 * x ) ) ;

// Tangent hyperbolic
exports.tanh = x => Math.tanh( x ) ;



/* Smooth variants */

exports.step.smooth = exports.sigmoid.hard ;
exports.linear.smooth = exports.linear ;
exports.rectifier.smooth = exports.softPlus.hard ;
exports.softPlus.smooth = exports.softPlus ;	// is this ok?
exports.softPlus.hard.smooth = exports.softPlus ;
exports.sigmoid.smooth = exports.sigmoid ;	// is this ok?
exports.sigmoid.hard.smooth = exports.sigmoid ;
exports.tanh.smooth = exports.tanh ;	// is this ok?



/* Slippy variants - always get some gradient */

exports.step.slippy = x => SLIPPY_FACTOR * x + exports.step( x ) ;
exports.linear.slippy = x => SLIPPY_FACTOR * x + exports.linear( x ) ;
exports.rectifier.slippy = x => SLIPPY_FACTOR * x + exports.rectifier( x ) ;
exports.softPlus.slippy = x => SLIPPY_FACTOR * x + exports.softPlus( x ) ;
exports.softPlus.hard.slippy = x => SLIPPY_FACTOR * x + exports.softPlus.hard( x ) ;
exports.sigmoid.slippy = x => SLIPPY_FACTOR * x + exports.sigmoid( x ) ;
exports.sigmoid.hard.slippy = x => SLIPPY_FACTOR * x + exports.sigmoid.hard( x ) ;
exports.tanh.slippy = x => SLIPPY_FACTOR * x + exports.tanh( x ) ;



/* Derivatives */

exports.step.derivative = () => 0 ;
exports.step.slippy.derivative = () => SLIPPY_FACTOR ;
exports.linear.derivative = () => 1 ;
exports.linear.slippy.derivative = () => SLIPPY_FACTOR + 1 ;
exports.rectifier.derivative = x => x >= 0 ? 1 : 0 ;
exports.rectifier.slippy.derivative = x => SLIPPY_FACTOR + exports.rectifier.derivative( x ) ;
exports.softPlus.derivative = exports.sigmoid ;
exports.softPlus.slippy.derivative = x => SLIPPY_FACTOR + exports.softPlus.derivative( x ) ;
exports.softPlus.hard.derivative = exports.sigmoid.hard ;
exports.softPlus.hard.slippy.derivative = x => SLIPPY_FACTOR + exports.softPlus.hard.derivative( x ) ;



exports.sigmoid.derivative = x => {
	var sx = 1 / ( 1 + Math.exp( -x ) ) ;
	return sx * ( 1 - sx ) ;
} ;



exports.tanh.derivative = x => {
	var tanhx = Math.tanh( x ) ;
	return 1 - tanhx * tanhx ;
} ;



exports.step.derivative = () => 0 ;
//exports.step.outputToDerivative = () => 0 ;

exports.heaviside = exports.step ;


