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



describe( "Network" , function() {
	
	it( "Feed forward order" , function() {
		
		var network = nk.createNetwork() ;
		
		var inputA = nk.createSignalEmitter() ,
			inputB = nk.createSignalEmitter() ;
		
		var outputA = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ,
			outputB = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ;
		
		var	hidden11 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ,
			hidden12 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ;
		
		var	hidden21 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ,
			hidden22 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ;
		
		var	hidden31 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ,
			hidden32 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ;
		
		network.addInput( 'a' , inputA ) ;
		network.addInput( 'b' , inputB ) ;
		network.addOutput( 'outputA' , outputA ) ;
		network.addOutput( 'outputB' , outputB ) ;
		network.addHiddenNeuron( hidden21 ) ;
		network.addHiddenNeuron( hidden22 ) ;
		network.addHiddenNeuron( hidden11 ) ;
		network.addHiddenNeuron( hidden12 ) ;
		network.addHiddenNeuron( hidden31 ) ;
		network.addHiddenNeuron( hidden32 ) ;
		
		inputA.connectTo( hidden11 , 1 ) ;
		inputA.connectTo( hidden12 , 1 ) ;
		inputB.connectTo( hidden11 , 1 ) ;
		inputB.connectTo( hidden12 , 1 ) ;
		
		hidden11.connectTo( hidden21 , 1 ) ;
		hidden11.connectTo( hidden22 , 1 ) ;
		hidden12.connectTo( hidden21 , 1 ) ;
		hidden12.connectTo( hidden22 , 1 ) ;
		
		hidden21.connectTo( hidden31 , 1 ) ;
		hidden21.connectTo( hidden32 , 1 ) ;
		hidden22.connectTo( hidden31 , 1 ) ;
		hidden22.connectTo( hidden32 , 1 ) ;
		
		hidden31.connectTo( outputA , 1 ) ;
		hidden31.connectTo( outputB , 1 ) ;
		hidden32.connectTo( outputA , 1 ) ;
		hidden32.connectTo( outputB , 1 ) ;
		
		network.feedForwardOrder() ;
		
		expect( network.neuronOrder.indexOf( hidden11 ) ).to.be.within( 0 , 1 ) ;
		expect( network.neuronOrder.indexOf( hidden12 ) ).to.be.within( 0 , 1 ) ;
		expect( network.neuronOrder.indexOf( hidden21 ) ).to.be.within( 2 , 3 ) ;
		expect( network.neuronOrder.indexOf( hidden22 ) ).to.be.within( 2 , 3 ) ;
		expect( network.neuronOrder.indexOf( hidden31 ) ).to.be.within( 4 , 5 ) ;
		expect( network.neuronOrder.indexOf( hidden32 ) ).to.be.within( 4 , 5 ) ;
		expect( network.neuronOrder.indexOf( outputA ) ).to.be.within( 6 , 7 ) ;
		expect( network.neuronOrder.indexOf( outputB ) ).to.be.within( 6 , 7 ) ;
		
		// Create a loop
		hidden32.connectTo( hidden21 , 1 ) ;
		
		// So .feedForwardOrder() should throw an error...
		try {
			network.feedForwardOrder() ;
			expect().fail( 'It should throw!' ) ;
		}
		catch( error ) {
		}
	} ) ;
} ) ;



/*
describe( "..." , function() {
	
	it( "..." , function() {
		var neuron = nk.createNeuron( { transfer: 'step' } ) ;
		
		var input1 = nk.createSignalEmitter() ,
			input2 = nk.createSignalEmitter() ;
		
		input1.connectTo( neuron , 1 ) ;
		input2.connectTo( neuron , -2 ) ;
		
		input1.signal = 2.4999 ;
		input2.signal = 1 ;
		
		neuron.forwardSignal() ;
		
		console.log( neuron.signal ) ;
	} ) ;
} ) ;
*/

