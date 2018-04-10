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



// Linear/identity function, probably useless
exports.linear = x => x ;
exports.linear.outputToDerivative = () => 1 ;



// Rectified linear function (relu)
exports.rectifier = x => Math.max( x , 0 ) ;
exports.rectifier.outputToDerivative = x => x > 0 ? 1 : 0 ;

exports.relu = exports.rectifier ;



// Leaky rectifier
exports.leakyRectifier = x => Math.max( x , 0.01 * x ) ;
exports.leakyRectifier.outputToDerivative = x => x > 0 ? 1 : 0.01 ;

exports.leakyRelu = exports.leakyRectifier ;



// SoftPlus function
exports.softPlus = x => Math.log( 1 + Math.exp( x ) ) ;
exports.softPlus.outputToDerivative = x => 1 / ( 1 + 1 / ( Math.exp( x ) - 1 ) ) ;



// Sigmoid
exports.sigmoid = x => 1 / ( 1 + Math.exp( -x ) ) ;
exports.sigmoid.outputToDerivative = x => x * ( 1 - x ) ;
//exports.sigmoid.inverse = x => Math.log( x / ( 1 - x ) ) ;

exports.logistic = exports.sigmoid ;



// Tangent hyperbolic
exports.tanh = x => Math.tanh( x ) ;
exports.tanh.outputToDerivative = x => 1 - x * x ;



// Step/Heavyside function
// This function is probably shitty for neural networks: no reliable inverse and derivative
exports.step = x => x >= 0 ? 1 : 0 ;
exports.step.outputToDerivative = x => 0 ;

exports.heavyside = exports.step ;


