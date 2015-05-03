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



var expect = require( 'expect.js' ) ;
var spp = require( 'smart-preprocessor' ) ;
var nk = require( '../lib/neuronsKit.js' ) ;
//





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



describe( "Learning" , function() {
	
	it( "Affine 'ax + b' learning" , function() {
		
		var i , learningSample = 80 , x , output , a , b , c , error , errorList = [] , averageError = 0 ;
		
		var network = nk.createNetwork() ;
			inputX = nk.createSignalEmitter() ,
			neuron = nk.createNeuron( { transfer: 'linear' , threshold: -10 + Math.random() * 20 } ) ;
		
		network.addInput( 'x' , inputX ) ;
		network.addOutput( 'output' , neuron ) ;
		
		a = Math.floor( -10 + Math.random() * 21 ) ;
		b = Math.floor( -10 + Math.random() * 21 ) ;
		
		inputX.connectTo( neuron , -10 + Math.random() * 20 ) ;
		
		for ( i = 0 ; i < learningSample ; i ++ )
		{
			//console.log( "\n-------- #%s -------- f(x) = %sx + %s --------" , i , a , b ) ;
			//console.log( "Wx: %s , bias: %s" , network.outputs.output.synapses[ 0 ].weight , - network.outputs.output.threshold ) ;
			
			x = -10 + Math.random() * 20 ;
			expected = a * x + b ;
			
			output = network.feedForward( { x: x } ) ;
			
			error = expected - output.output ;
			errorList.push( error ) ;
			
			//console.log( "x: %s , expected: %s , output: %s , error: %s" , x , expected , output.output , error ) ;
			
			network.backwardCorrection( { output: expected } ) ;
		}
		
		for ( i = learningSample - 20 ; i < learningSample ; i ++ ) { averageError += errorList[ i ] ; }
		averageError = averageError / 20 ;
		
		//console.log( averageError ) ;
		
		expect( averageError ).to.be.within( -0.1 , 0.1 ) ;
	} ) ;
	
	it( "Affine 'ax + by + c' learning" , function() {
		
		var i , learningSample = 150 , x , y , output , a , b , c , error , errorList = [] , averageError = 0 ;
		
		var network = nk.createNetwork() ;
			inputX = nk.createSignalEmitter() ,
			inputY = nk.createSignalEmitter() ,
			neuron = nk.createNeuron( { transfer: 'linear' , threshold: -10 + Math.random() * 20 } ) ;
		
		network.addInput( 'x' , inputX ) ;
		network.addInput( 'y' , inputY ) ;
		network.addOutput( 'output' , neuron ) ;
		
		a = Math.floor( -10 + Math.random() * 21 ) ;
		b = Math.floor( -10 + Math.random() * 21 ) ;
		c = Math.floor( -10 + Math.random() * 21 ) ;
		
		inputX.connectTo( neuron , -10 + Math.random() * 20 ) ;
		inputY.connectTo( neuron , -10 + Math.random() * 20 ) ;
		
		for ( i = 0 ; i < learningSample ; i ++ )
		{
			//console.log( "\n-------- #%s -------- f(x,y) = %sx + %sy + %s --------" , i , a , b , c ) ;
			//console.log( "Wx: %s , Wy: %s , bias: %s" , network.outputs.output.synapses[ 0 ].weight , network.outputs.output.synapses[ 1 ].weight , - network.outputs.output.threshold ) ;
			
			x = -10 + Math.random() * 20 ;
			y = -10 + Math.random() * 20 ;
			expected = a * x + b * y + c ;
			
			output = network.feedForward( { x: x , y: y } ) ;
			
			error = expected - output.output ;
			errorList.push( error ) ;
			
			//console.log( "x: %s , y: %s , expected: %s , output: %s , error: %s" , x , y , expected , output.output , error ) ;
			
			network.backwardCorrection( { output: expected } ) ;
		}
		
		for ( i = learningSample - 20 ; i < learningSample ; i ++ ) { averageError += errorList[ i ] ; }
		averageError = averageError / 20 ;
		
		//console.log( averageError ) ;
		
		expect( averageError ).to.be.within( -0.1 , 0.1 ) ;
	} ) ;
	
	it( "Affine 'ax + by + cx + d' learning" , function() {
		
		var i , learningSample = 250 , x , y , z , output , a , b , c , d , error , errorList = [] , averageError = 0 ;
		
		var network = nk.createNetwork() ;
			inputX = nk.createSignalEmitter() ,
			inputY = nk.createSignalEmitter() ,
			inputZ = nk.createSignalEmitter() ,
			neuron = nk.createNeuron( { transfer: 'linear' , threshold: -10 + Math.random() * 20 } ) ;
		
		network.addInput( 'x' , inputX ) ;
		network.addInput( 'y' , inputY ) ;
		network.addInput( 'z' , inputZ ) ;
		network.addOutput( 'output' , neuron ) ;
		
		a = Math.floor( -10 + Math.random() * 21 ) ;
		b = Math.floor( -10 + Math.random() * 21 ) ;
		c = Math.floor( -10 + Math.random() * 21 ) ;
		d = Math.floor( -10 + Math.random() * 21 ) ;
		
		inputX.connectTo( neuron , -10 + Math.random() * 20 ) ;
		inputY.connectTo( neuron , -10 + Math.random() * 20 ) ;
		inputZ.connectTo( neuron , -10 + Math.random() * 20 ) ;
		
		for ( i = 0 ; i < learningSample ; i ++ )
		{
			//console.log( "\n-------- #%s -------- f(x,y) = %sx + %sy + %sz + %s --------" , i , a , b , c , d ) ;
			//console.log( "Wx: %s , Wy: %s , Wz: %s , bias: %s" , network.outputs.output.synapses[ 0 ].weight , network.outputs.output.synapses[ 1 ].weight , network.outputs.output.synapses[ 1 ].weight , - network.outputs.output.threshold ) ;
			
			x = -10 + Math.random() * 20 ;
			y = -10 + Math.random() * 20 ;
			z = -10 + Math.random() * 20 ;
			expected = a * x + b * y + c * z + d ;
			
			output = network.feedForward( { x: x , y: y , z: z } ) ;
			
			error = expected - output.output ;
			errorList.push( error ) ;
			
			//console.log( "x: %s , y: %s , expected: %s , output: %s , error: %s" , x , y , expected , output.output , error ) ;
			
			network.backwardCorrection( { output: expected } ) ;
		}
		
		for ( i = learningSample - 20 ; i < learningSample ; i ++ ) { averageError += errorList[ i ] ; }
		averageError = averageError / 20 ;
		
		//console.log( averageError ) ;
		
		expect( averageError ).to.be.within( -0.1 , 0.1 ) ;
	} ) ;
} ) ;

