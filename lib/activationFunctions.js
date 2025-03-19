/*
	Neurons Kit

	Copyright (c) 2015 - 2020 Cédric Ronvel

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



const functions = {} ;
module.exports = functions ;



/* Activation functions */

// Step/Heaviside function
functions.step = functions.heaviside = x => Math.max( 0 , Math.sign( x ) ) ;
// This is 2.5 times faster than   x > 0 ? 1 : 0   (tested on Node v10)

// Linear/identity function
functions.linear = x => x ;

// Rectified linear function (relu)
functions.rectifier = functions.relu = x => Math.max( 0 , x ) ;
// This is 2.5 times faster than   x > 0 ? x : 0   (tested on Node v10)

// reluX where X is the maximum
functions.rectifier1 = functions.relu1 = x => Math.max( 0 , Math.min( x , 1 ) ) ;
functions.rectifier2 = functions.relu2 = x => Math.max( 0 , Math.min( x , 2 ) ) ;
functions.rectifier6 = functions.relu6 = x => Math.max( 0 , Math.min( x , 6 ) ) ;

// SoftPlus function
functions.softPlus = x => Math.log( 1 + Math.exp( x ) ) ;

// Harder softPlus, good for closer relu approximation
functions.hardSoftPlus = functions.softPlus.hard = x => 0.25 * functions.softPlus( 4 * x ) ;

// Sigmoid / Logistic
functions.sigmoid = functions.logistic = x => 1 / ( 1 + Math.exp( -x ) ) ;

// Harder Sigmoid, good for Heaviside approximation
functions.hardSigmoid = functions.sigmoid.hard = x => functions.sigmoid( 4 * x ) ;

// Tangent hyperbolic
functions.tanh = x => Math.tanh( x ) ;



/* Smooth variants */

functions.step.smooth = functions.sigmoid.hard ;
functions.linear.smooth = functions.linear ;
functions.rectifier.smooth = functions.softPlus.hard ;
functions.softPlus.smooth = functions.softPlus ;	// is this ok?
functions.softPlus.hard.smooth = functions.softPlus ;
functions.sigmoid.smooth = functions.sigmoid ;	// is this ok?
functions.sigmoid.hard.smooth = functions.sigmoid ;
functions.tanh.smooth = functions.tanh ;	// is this ok?



/* Leaky variants - always get some gradient */

functions.step.leaky = x => functions.LEAK_FACTOR * x + Math.max( 0 , Math.sign( x ) ) ;
functions.linear.leaky = functions.linear ;
functions.rectifier.leaky = x => Math.max( functions.LEAK_FACTOR * x , x ) ;
functions.rectifier1.leaky = x => Math.max( functions.LEAK_FACTOR * x , Math.min( x , 1 + functions.LEAK_FACTOR * ( x - 1 ) ) ) ;
functions.rectifier2.leaky = x => Math.max( functions.LEAK_FACTOR * x , Math.min( x , 2 + functions.LEAK_FACTOR * ( x - 2 ) ) ) ;
functions.rectifier6.leaky = x => Math.max( functions.LEAK_FACTOR * x , Math.min( x , 6 + functions.LEAK_FACTOR * ( x - 6 ) ) ) ;
functions.softPlus.leaky = x => functions.LEAK_FACTOR * x + functions.softPlus( x ) ;
functions.softPlus.hard.leaky = x => functions.LEAK_FACTOR * x + functions.softPlus.hard( x ) ;
functions.sigmoid.leaky = x => functions.LEAK_FACTOR * x + functions.sigmoid( x ) ;
functions.sigmoid.hard.leaky = x => functions.LEAK_FACTOR * x + functions.sigmoid.hard( x ) ;
functions.tanh.leaky = x => functions.LEAK_FACTOR * x + functions.tanh( x ) ;



/* Derivatives */

functions.step.derivative = () => 0 ;
functions.linear.derivative = () => 1 ;
functions.rectifier.derivative = x => x >= 0 ? 1 : 0 ;
functions.rectifier1.derivative = x => x >= 0 && x <= 1 ? 1 : 0 ;
functions.rectifier2.derivative = x => x >= 0 && x <= 2 ? 1 : 0 ;
functions.rectifier6.derivative = x => x >= 0 && x <= 6 ? 1 : 0 ;
functions.softPlus.derivative = functions.sigmoid ;
functions.softPlus.hard.derivative = functions.sigmoid.hard ;
functions.sigmoid.derivative = x => {
	let sx = functions.sigmoid( x ) ;
	return sx * ( 1 - sx ) ;
} ;
functions.sigmoid.hard.derivative = x => 4 * functions.sigmoid.derivative( 4 * x ) ;
functions.tanh.derivative = x => 1 - Math.tanh( x ) ** 2 ;

functions.step.leaky.derivative = () => functions.LEAK_FACTOR ;
//functions.linear.leaky.derivative = () => 1 ;
functions.rectifier.leaky.derivative = x => functions.LEAK_FACTOR + functions.rectifier.derivative( x ) ;
functions.rectifier1.leaky.derivative = x => functions.LEAK_FACTOR + functions.rectifier1.derivative( x ) ;
functions.rectifier2.leaky.derivative = x => functions.LEAK_FACTOR + functions.rectifier2.derivative( x ) ;
functions.rectifier6.leaky.derivative = x => functions.LEAK_FACTOR + functions.rectifier6.derivative( x ) ;
functions.softPlus.leaky.derivative = x => functions.LEAK_FACTOR + functions.softPlus.derivative( x ) ;
functions.softPlus.hard.leaky.derivative = x => functions.LEAK_FACTOR + functions.softPlus.hard.derivative( x ) ;
functions.sigmoid.leaky.derivative = x => functions.LEAK_FACTOR + functions.sigmoid.derivative( x ) ;
functions.sigmoid.hard.leaky.derivative = x => functions.LEAK_FACTOR + functions.sigmoid.hard.derivative( x ) ;
functions.tanh.leaky.derivative = x => functions.LEAK_FACTOR + functions.tanh.derivative( x ) ;



/* Slippy Derivatives - fake derivatives that always get some gradients, and more anticipating/adaptative gradients */

// The order matters
functions.linear.derivative.slippy = functions.linear.derivative ;
functions.sigmoid.derivative.slippy = ( x , direction ) => x * direction >= 0 ?
	functions.sigmoid.derivative( x ) :
	functions.sigmoid.leaky.derivative( 0.5 * x ) ;
functions.sigmoid.hard.derivative.slippy = ( x , direction ) => x * direction >= 0 ?
	functions.sigmoid.hard.derivative( x ) :
	functions.sigmoid.hard.leaky.derivative( 0.5 * x ) ;
functions.tanh.derivative.slippy = ( x , direction ) => x * direction >= 0 ?
	functions.tanh.derivative( x ) :
	functions.tanh.leaky.derivative( 0.5 * x ) ;

functions.softPlus.derivative.slippy = ( x , direction ) => direction <= 0 ?
	functions.sigmoid( x ) :
	functions.LEAK_FACTOR + functions.sigmoid( x + 0.5 ) ;
functions.softPlus.hard.derivative.slippy = ( x , direction ) => direction <= 0 ?
	functions.sigmoid.hard( x ) :
	functions.LEAK_FACTOR + functions.sigmoid.hard( x + 0.5 ) ;

functions.step.derivative.slippy = ( x , direction ) => x * direction > 0 ?
	functions.step.derivative( x ) :
	functions.sigmoid.hard.leaky.derivative( 0.5 * x ) ;

functions.rectifier.derivative.slippy = ( x , direction ) => direction <= 0 || x >= 0 ?
	functions.rectifier.derivative( x ) :
	functions.LEAK_FACTOR + functions.sigmoid.hard( x + 0.5 ) ;

functions.rectifier1.derivative.slippy = ( x , direction ) => ( x >= 0 && x <= 1 ) || x * direction >= 0 ?
	functions.rectifier1.derivative( x ) :
	( x < 0 ?
		functions.LEAK_FACTOR + functions.sigmoid.hard( x + 0.5 ) :
		functions.LEAK_FACTOR + functions.sigmoid.hard( -x + 1.5 )
	) ;

functions.rectifier2.derivative.slippy = ( x , direction ) => ( x >= 0 && x <= 2 ) || x * direction >= 0 ?
	functions.rectifier2.derivative( x ) :
	( x < 0 ?
		functions.LEAK_FACTOR + functions.sigmoid.hard( x + 0.5 ) :
		functions.LEAK_FACTOR + functions.sigmoid.hard( -x + 2.5 )
	) ;

functions.rectifier6.derivative.slippy = ( x , direction ) => ( x >= 0 && x <= 6 ) || x * direction >= 0 ?
	functions.rectifier6.derivative( x ) :
	( x < 0 ?
		functions.LEAK_FACTOR + functions.sigmoid.hard( x + 0.5 ) :
		functions.LEAK_FACTOR + functions.sigmoid.hard( -x + 6.5 )
	) ;



/* leaky+slippy is the same as slippy */

functions.step.leaky.derivative.slippy = functions.step.derivative.slippy ;
//functions.linear.leaky.derivative.slippy
functions.rectifier.leaky.derivative.slippy = functions.rectifier.derivative.slippy ;
functions.rectifier1.leaky.derivative.slippy = functions.rectifier1.derivative.slippy ;
functions.rectifier2.leaky.derivative.slippy = functions.rectifier2.derivative.slippy ;
functions.rectifier6.leaky.derivative.slippy = functions.rectifier6.derivative.slippy ;
functions.softPlus.leaky.derivative.slippy = functions.softPlus.derivative.slippy ;
functions.softPlus.hard.leaky.derivative.slippy = functions.softPlus.hard.derivative.slippy ;
functions.sigmoid.leaky.derivative.slippy = functions.sigmoid.derivative.slippy ;
functions.sigmoid.hard.leaky.derivative.slippy = functions.sigmoid.hard.derivative.slippy ;
functions.tanh.leaky.derivative.slippy = functions.tanh.derivative.slippy ;



// Find a function by a string
functions.BY_NAME = Object.assign( {} , functions ) ;
functions.BY_NAME.hardSigmoid = functions.sigmoid.hard ;
functions.BY_NAME.hardSoftPlus = functions.softPlus.hard ;

for ( let name in functions.BY_NAME ) {
	functions.BY_NAME[ name ].id = name ;
}

functions.LEAK_FACTOR = 0.05 ;

