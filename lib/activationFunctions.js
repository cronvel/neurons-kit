/*
	Neurons Kit

	Copyright (c) 2015 - 2019 Cédric Ronvel

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

/* eslint-disable no-nested-ternary */



/* Activation functions */

// Step/Heaviside function
exports.step = exports.heaviside = x => Math.max( 0 , Math.sign( x ) ) ;
// This is 2.5 times faster than   x > 0 ? 1 : 0   (tested on Node v10)

// Linear/identity function
exports.linear = x => x ;

// Rectified linear function (relu)
exports.rectifier = exports.relu = x => Math.max( 0 , x ) ;
// This is 2.5 times faster than   x > 0 ? x : 0   (tested on Node v10)

// reluX where X is the maximum
exports.rectifier1 = exports.relu1 = x => Math.max( 0 , Math.min( x , 1 ) ) ;
exports.rectifier2 = exports.relu2 = x => Math.max( 0 , Math.min( x , 2 ) ) ;
exports.rectifier6 = exports.relu6 = x => Math.max( 0 , Math.min( x , 6 ) ) ;

// SoftPlus function
exports.softPlus = x => Math.log( 1 + Math.exp( x ) ) ;

// Harder softPlus, good for closer relu approximation
exports.softPlus.hard = x => 0.25 * exports.softPlus( 4 * x ) ;

// Sigmoid / Logistic
exports.sigmoid = exports.logistic = x => 1 / ( 1 + Math.exp( -x ) ) ;

// Harder Sigmoid, good for Heaviside approximation
exports.sigmoid.hard = x => exports.sigmoid( 4 * x ) ;

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



/* Leaky variants - always get some gradient */

exports.step.leaky = x => exports.LEAK_FACTOR * x + Math.max( 0 , Math.sign( x ) ) ;
exports.linear.leaky = exports.linear ;
exports.rectifier.leaky = x => Math.max( exports.LEAK_FACTOR * x , x ) ;
exports.rectifier1.leaky = x => Math.max( exports.LEAK_FACTOR * x , Math.min( x , 1 + exports.LEAK_FACTOR * ( x - 1 ) ) ) ;
exports.rectifier2.leaky = x => Math.max( exports.LEAK_FACTOR * x , Math.min( x , 2 + exports.LEAK_FACTOR * ( x - 2 ) ) ) ;
exports.rectifier6.leaky = x => Math.max( exports.LEAK_FACTOR * x , Math.min( x , 6 + exports.LEAK_FACTOR * ( x - 6 ) ) ) ;
exports.softPlus.leaky = x => exports.LEAK_FACTOR * x + exports.softPlus( x ) ;
exports.softPlus.hard.leaky = x => exports.LEAK_FACTOR * x + exports.softPlus.hard( x ) ;
exports.sigmoid.leaky = x => exports.LEAK_FACTOR * x + exports.sigmoid( x ) ;
exports.sigmoid.hard.leaky = x => exports.LEAK_FACTOR * x + exports.sigmoid.hard( x ) ;
exports.tanh.leaky = x => exports.LEAK_FACTOR * x + exports.tanh( x ) ;



/* Slippy variants - always get some gradient */
/*
exports.step.slippy = x => SLIP_FACTOR * x + exports.step( x ) ;
exports.linear.slippy = x => SLIP_FACTOR * x + exports.linear( x ) ;
exports.rectifier.slippy = x => SLIP_FACTOR * x + exports.rectifier( x ) ;
exports.softPlus.slippy = x => SLIP_FACTOR * x + exports.softPlus( x ) ;
exports.softPlus.hard.slippy = x => SLIP_FACTOR * x + exports.softPlus.hard( x ) ;
exports.sigmoid.slippy = x => SLIP_FACTOR * x + exports.sigmoid( x ) ;
exports.sigmoid.hard.slippy = x => SLIP_FACTOR * x + exports.sigmoid.hard( x ) ;
exports.tanh.slippy = x => SLIP_FACTOR * x + exports.tanh( x ) ;
*/


/* Derivatives */

exports.step.derivative = () => 0 ;
exports.linear.derivative = () => 1 ;
exports.rectifier.derivative = x => x >= 0 ? 1 : 0 ;
exports.rectifier1.derivative = x => x >= 0 && x <= 1 ? 1 : 0 ;
exports.rectifier2.derivative = x => x >= 0 && x <= 2 ? 1 : 0 ;
exports.rectifier6.derivative = x => x >= 0 && x <= 6 ? 1 : 0 ;
exports.softPlus.derivative = exports.sigmoid ;
exports.softPlus.hard.derivative = exports.sigmoid.hard ;
exports.sigmoid.derivative = x => {
	var sx = exports.sigmoid( x ) ;
	return sx * ( 1 - sx ) ;
} ;
exports.sigmoid.hard.derivative = x => 4 * exports.sigmoid.derivative( 4 * x ) ;
exports.tanh.derivative = x => 1 - Math.tanh( x ) ** 2 ;

exports.step.leaky.derivative = () => exports.LEAK_FACTOR ;
//exports.linear.leaky.derivative = () => 1 ;
exports.rectifier.leaky.derivative = x => exports.LEAK_FACTOR + exports.rectifier.derivative( x ) ;
exports.rectifier1.leaky.derivative = x => exports.LEAK_FACTOR + exports.rectifier1.derivative( x ) ;
exports.rectifier2.leaky.derivative = x => exports.LEAK_FACTOR + exports.rectifier2.derivative( x ) ;
exports.rectifier6.leaky.derivative = x => exports.LEAK_FACTOR + exports.rectifier6.derivative( x ) ;
exports.softPlus.leaky.derivative = x => exports.LEAK_FACTOR + exports.softPlus.derivative( x ) ;
exports.softPlus.hard.leaky.derivative = x => exports.LEAK_FACTOR + exports.softPlus.hard.derivative( x ) ;
exports.sigmoid.leaky.derivative = x => exports.LEAK_FACTOR + exports.sigmoid.derivative( x ) ;
exports.sigmoid.hard.leaky.derivative = x => exports.LEAK_FACTOR + exports.sigmoid.hard.derivative( x ) ;
exports.tanh.leaky.derivative = x => exports.LEAK_FACTOR + exports.tanh.derivative( x ) ;



/* Slippy Derivatives - fake derivatives that always get some gradients, and more anticipating/adaptative gradients */

// The order matters
exports.linear.derivative.slippy = exports.linear.derivative ;
exports.sigmoid.derivative.slippy = ( x , direction ) => x * direction >= 0 ?
	exports.sigmoid.derivative( x ) :
	exports.sigmoid.leaky.derivative( 0.5 * x ) ;
exports.sigmoid.hard.derivative.slippy = ( x , direction ) => x * direction >= 0 ?
	exports.sigmoid.hard.derivative( x ) :
	exports.sigmoid.hard.leaky.derivative( 0.5 * x ) ;
exports.tanh.derivative.slippy = ( x , direction ) => x * direction >= 0 ?
	exports.tanh.derivative( x ) :
	exports.tanh.leaky.derivative( 0.5 * x ) ;

//exports.softPlus.derivative.slippy =
exports.sigmoid.slippy = ( x , direction ) => direction <= 0 ?
	exports.sigmoid( x ) :
	exports.LEAK_FACTOR + exports.sigmoid( x + 0.5 ) ;
//exports.softPlus.hard.derivative.slippy =
exports.sigmoid.hard.slippy = ( x , direction ) => direction <= 0 ?
	exports.sigmoid.hard( x ) :
	exports.LEAK_FACTOR + exports.sigmoid.hard( x + 0.5 ) ;

exports.step.derivative.slippy = ( x , direction ) => x * direction > 0 ?
	exports.step.derivative( x ) :
	exports.sigmoid.hard.leaky.derivative( 0.5 * x ) ;

exports.rectifier.derivative.slippy = ( x , direction ) => direction <= 0 || x >= 0 ?
	exports.rectifier.derivative( x ) :
	exports.LEAK_FACTOR + exports.sigmoid.hard( x + 0.5 ) ;

exports.rectifier1.derivative.slippy = ( x , direction ) => ( x >= 0 && x <= 1 ) || x * direction >= 0 ?
	exports.rectifier1.derivative( x ) :
	( x < 0 ?
		exports.LEAK_FACTOR + exports.sigmoid.hard( x + 0.5 ) :
		exports.LEAK_FACTOR + exports.sigmoid.hard( -x + 1.5 )
	) ;

exports.rectifier2.derivative.slippy = ( x , direction ) => ( x >= 0 && x <= 2 ) || x * direction >= 0 ?
	exports.rectifier2.derivative( x ) :
	( x < 0 ?
		exports.LEAK_FACTOR + exports.sigmoid.hard( x + 0.5 ) :
		exports.LEAK_FACTOR + exports.sigmoid.hard( -x + 2.5 )
	) ;

exports.rectifier6.derivative.slippy = ( x , direction ) => ( x >= 0 && x <= 6 ) || x * direction >= 0 ?
	exports.rectifier6.derivative( x ) :
	( x < 0 ?
		exports.LEAK_FACTOR + exports.sigmoid.hard( x + 0.5 ) :
		exports.LEAK_FACTOR + exports.sigmoid.hard( -x + 6.5 )
	) ;



/* leaky+slippy is the same as slippy */

exports.step.leaky.derivative.slippy = exports.step.derivative.slippy ;
//exports.linear.leaky.derivative.slippy
exports.rectifier.leaky.derivative.slippy = exports.rectifier.derivative.slippy ;
exports.rectifier1.leaky.derivative.slippy = exports.rectifier1.derivative.slippy ;
exports.rectifier2.leaky.derivative.slippy = exports.rectifier2.derivative.slippy ;
exports.rectifier6.leaky.derivative.slippy = exports.rectifier6.derivative.slippy ;
exports.softPlus.leaky.derivative.slippy = exports.softPlus.derivative.slippy ;
exports.softPlus.hard.leaky.derivative.slippy = exports.softPlus.hard.derivative.slippy ;
exports.sigmoid.leaky.derivative.slippy = exports.sigmoid.derivative.slippy ;
exports.sigmoid.hard.leaky.derivative.slippy = exports.sigmoid.hard.derivative.slippy ;
exports.tanh.leaky.derivative.slippy = exports.tanh.derivative.slippy ;



// Find a function by a string
exports.BY_NAME = Object.assign( {} , exports ) ;
exports.BY_NAME.hardSigmoid = exports.sigmoid.hard ;
exports.BY_NAME.hardSoftPlus = exports.softPlus.hard ;

for ( let name in exports.BY_NAME ) {
	exports.BY_NAME[ name ].id = name ;
}

exports.LEAK_FACTOR = 0.05 ;

