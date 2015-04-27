/*
	The Cedric's Swiss Knife (CSK) - CSK neurons toolbox

	Copyright (c) 2015 Cédric Ronvel 
	
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

/* jshint unused:false */
/* global describe, it, before, after */



var nk = require( '../lib/neuronsKit.js' ) ;
var expect = require( 'expect.js' ) ;



			/* Tests */



describe( "..." , function() {
	
	it( "..." , function() {
		var neuron = nk.createNeuron( { transfer: 'step' } ) ;
		
		var input1 = nk.createSignalEmitter() ,
			input2 = nk.createSignalEmitter() ;
		
		input1.connectTo( neuron , 1 ) ;
		input2.connectTo( neuron , -2 ) ;
		
		input1.signal = 2.4999 ;
		input2.signal = 1 ;
		
		neuron.update() ;
		
		console.log( neuron.signal ) ;
	} ) ;
} ) ;

