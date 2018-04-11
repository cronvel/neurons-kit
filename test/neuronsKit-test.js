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



var nk = require( '..' ) ;
var expect = require( 'expect.js' ) ;





			/* Tests */



describe( "Network" , function() {
	
	it( "Feed forward order" , function() {
		
		var network = new nk.Network() ,
			inputA = new nk.SignalEmitter() ,
			inputB = new nk.SignalEmitter() ,
			outputA = new nk.Neuron() ,
			outputB = new nk.Neuron() ;

		var	hidden11 = new nk.Neuron() ,
			hidden12 = new nk.Neuron() ;

		var	hidden21 = new nk.Neuron() ,
			hidden22 = new nk.Neuron() ;

		var	hidden31 = new nk.Neuron() ,
			hidden32 = new nk.Neuron() ;

		network.addInput( inputA , 'a' ) ;
		network.addInput( inputB , 'b' ) ;
		network.addOutput( outputA , 'outputA' , outputA ) ;
		network.addOutput( outputB , 'outputB' , outputB ) ;
		network.addHidden( hidden31 ) ;
		network.addHidden( hidden32 ) ;
		network.addHidden( hidden21 ) ;
		network.addHidden( hidden22 ) ;
		network.addHidden( hidden11 ) ;
		network.addHidden( hidden12 ) ;

		hidden11.addInput( inputA , 1 ) ;
		hidden11.addInput( inputB , 1 ) ;
		hidden12.addInput( inputA , 1 ) ;
		hidden12.addInput( inputB , 1 ) ;

		hidden21.addInput( hidden11 , 1 ) ;
		hidden21.addInput( hidden12 , 1 ) ;
		hidden22.addInput( hidden11 , 1 ) ;
		hidden22.addInput( hidden12 , 1 ) ;

		hidden31.addInput( hidden21 , 1 ) ;
		hidden31.addInput( hidden22 , 1 ) ;
		hidden32.addInput( hidden21 , 1 ) ;
		hidden32.addInput( hidden22 , 1 ) ;

		outputA.addInput( hidden31 , 1 ) ;
		outputA.addInput( hidden32 , 1 ) ;
		outputB.addInput( hidden31 , 1 ) ;
		outputB.addInput( hidden32 , 1 ) ;

		network.init() ;
		
		expect( network.orderedUnits.indexOf( hidden11 ) ).to.be.within( 0 , 1 ) ;
		expect( network.orderedUnits.indexOf( hidden12 ) ).to.be.within( 0 , 1 ) ;
		expect( network.orderedUnits.indexOf( hidden21 ) ).to.be.within( 2 , 3 ) ;
		expect( network.orderedUnits.indexOf( hidden22 ) ).to.be.within( 2 , 3 ) ;
		expect( network.orderedUnits.indexOf( hidden31 ) ).to.be.within( 4 , 5 ) ;
		expect( network.orderedUnits.indexOf( hidden32 ) ).to.be.within( 4 , 5 ) ;
		expect( network.orderedUnits.indexOf( outputA ) ).to.be.within( 6 , 7 ) ;
		expect( network.orderedUnits.indexOf( outputB ) ).to.be.within( 6 , 7 ) ;
		
		// Create a loop
		hidden21.addInput( hidden31 , 1 ) ;
		
		// So .computeUnitOrder() should throw an error...
		try {
			network.init() ;
			expect().fail( 'It should throw!' ) ;
		}
		catch( error ) {
		}
	} ) ;
} ) ;



describe( "Single neuron learning" , function() {
	
	it( "zzz logical AND learning" , function() {
		var samples , output , averageError ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			neuron = new nk.Neuron( { transfer: nk.transferFunctions.relu } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( neuron , 'output' ) ;
		
		neuron.addInput( inputX ) ;
		neuron.addInput( inputY ) ;
		
		network.init() ;
		network.randomize() ;
		
		samples = [
			[ [ 0 , 0 ] , [ 0 ] ] ,
			[ [ 0 , 1 ] , [ 0 ] ] ,
			[ [ 1 , 0 ] , [ 0 ] ] ,
			[ [ 1 , 1 ] , [ 1 ] ]
		] ;
		
		averageError = network.train( samples , {
			maxRound: 200 ,
			maxError: 0.01
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.01 ) ;
	} ) ;
	
	it( "xxx logical OR learning" , function() {
		var samples , output , averageError ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			neuron = new nk.Neuron( { transfer: nk.transferFunctions.sigmoid } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( neuron , 'output' ) ;
		
		neuron.addInput( inputX ) ;
		neuron.addInput( inputY ) ;
		
		network.init() ;
		network.randomize() ;
		
		samples = [
			[ [ 0 , 0 ] , [ 0 ] ] ,
			[ [ 0 , 1 ] , [ 1 ] ] ,
			[ [ 1 , 0 ] , [ 1 ] ] ,
			[ [ 1 , 1 ] , [ 1 ] ]
		] ;
		
		averageError = network.train( samples , {
			maxRound: 200 ,
			maxError: 0.1
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.1 ) ;
	} ) ;
	
	it( "logical NAND learning" , function() {
		var samples , output , averageError ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			neuron = new nk.Neuron( { transfer: nk.transferFunctions.sigmoid } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( neuron , 'output' ) ;
		
		neuron.addInput( inputX ) ;
		neuron.addInput( inputY ) ;
		
		network.init() ;
		network.randomize() ;
		
		samples = [
			[ [ 0 , 0 ] , [ 1 ] ] ,
			[ [ 0 , 1 ] , [ 1 ] ] ,
			[ [ 1 , 0 ] , [ 1 ] ] ,
			[ [ 1 , 1 ] , [ 0 ] ]
		] ;
		
		averageError = network.train( samples , {
			maxRound: 200 ,
			maxError: 0.1
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.1 ) ;
	} ) ;
	
	it( "logical NOR learning" , function() {
		var samples , output , averageError ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			neuron = new nk.Neuron( { transfer: nk.transferFunctions.relu } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( neuron , 'output' ) ;
		
		neuron.addInput( inputX ) ;
		neuron.addInput( inputY ) ;
		
		network.init() ;
		network.randomize() ;
		
		samples = [
			[ [ 0 , 0 ] , [ 1 ] ] ,
			[ [ 0 , 1 ] , [ 0 ] ] ,
			[ [ 1 , 0 ] , [ 0 ] ] ,
			[ [ 1 , 1 ] , [ 0 ] ]
		] ;
		
		averageError = network.train( samples , {
			maxRound: 200 ,
			maxError: 0.1
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.1 ) ;
	} ) ;
	
	it( "Affine 'ax + b' learning" , function() {
		
		var i , learningSample = 80 , x , output , a , b , c , error , errorList = [] , averageError = 0 ;
		
		var network = nk.createNetwork() ,
			inputX = nk.createSignalEmitter() ,
			neuron = nk.createNeuron( { transfer: 'linear' , bias: -10 + Math.random() * 20 } ) ;
		
		network.addInput( 'x' , inputX ) ;
		network.addOutput( 'output' , neuron ) ;
		
		a = Math.floor( -10 + Math.random() * 21 ) ;
		b = Math.floor( -10 + Math.random() * 21 ) ;
		
		inputX.connectTo( neuron , -10 + Math.random() * 20 ) ;
		
		for ( i = 0 ; i < learningSample ; i ++ )
		{
			//console.log( "\n-------- #%s -------- f(x) = %sx + %s --------" , i , a , b ) ;
			//console.log( "Wx: %s , bias: %s" , network.outputs.output.synapses[ 0 ].weight , - network.outputs.output.bias ) ;
			
			x = -10 + Math.random() * 20 ;
			expected = a * x + b ;
			
			output = network.feedForward( { x: x } ) ;
			
			error = expected - output.output ;
			errorList.push( error ) ;
			
			//console.log( "x: %s , expected: %s , output: %s , error: %s" , x , expected , output.output , error ) ;
			
			network.backwardCorrection( { output: expected } ) ;
		}
		
		for ( i = learningSample - 20 ; i < learningSample ; i ++ ) { averageError += Math.abs( errorList[ i ] ) ; }
		averageError = averageError / 20 ;
		
		//console.log( averageError ) ;
		
		expect( averageError ).to.be.within( -0.1 , 0.1 ) ;
	} ) ;
	
	it( "Affine 'ax + by + c' learning" , function() {
		
		var i , learningSample = 150 , x , y , output , a , b , c , error , errorList = [] , averageError = 0 ;
		
		var network = nk.createNetwork() ,
			inputX = nk.createSignalEmitter() ,
			inputY = nk.createSignalEmitter() ,
			neuron = nk.createNeuron( { transfer: 'linear' , bias: -10 + Math.random() * 20 } ) ;
		
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
			//console.log( "Wx: %s , Wy: %s , bias: %s" , network.outputs.output.synapses[ 0 ].weight , network.outputs.output.synapses[ 1 ].weight , - network.outputs.output.bias ) ;
			
			x = -10 + Math.random() * 20 ;
			y = -10 + Math.random() * 20 ;
			expected = a * x + b * y + c ;
			
			output = network.feedForward( { x: x , y: y } ) ;
			
			error = expected - output.output ;
			errorList.push( error ) ;
			
			//console.log( "x: %s , y: %s , expected: %s , output: %s , error: %s" , x , y , expected , output.output , error ) ;
			
			network.backwardCorrection( { output: expected } ) ;
		}
		
		for ( i = learningSample - 20 ; i < learningSample ; i ++ ) { averageError += Math.abs( errorList[ i ] ) ; }
		averageError = averageError / 20 ;
		
		//console.log( averageError ) ;
		
		expect( averageError ).to.be.within( -0.1 , 0.1 ) ;
	} ) ;
	
	it( "Affine 'ax + by + cx + d' learning" , function() {
		
		var i , learningSample = 250 , x , y , z , output , a , b , c , d , error , errorList = [] , averageError = 0 ;
		
		var network = nk.createNetwork() ,
			inputX = nk.createSignalEmitter() ,
			inputY = nk.createSignalEmitter() ,
			inputZ = nk.createSignalEmitter() ,
			neuron = nk.createNeuron( { transfer: 'linear' , bias: -10 + Math.random() * 20 } ) ;
		
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
			//console.log( "Wx: %s , Wy: %s , Wz: %s , bias: %s" , network.outputs.output.synapses[ 0 ].weight , network.outputs.output.synapses[ 1 ].weight , network.outputs.output.synapses[ 1 ].weight , - network.outputs.output.bias ) ;
			
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
		
		for ( i = learningSample - 20 ; i < learningSample ; i ++ ) { averageError += Math.abs( errorList[ i ] ) ; }
		averageError = averageError / 20 ;
		
		//console.log( averageError ) ;
		
		expect( averageError ).to.be.within( -0.1 , 0.1 ) ;
	} ) ;
} ) ;

	

describe( "Multiple neurons learning" , function() {
	
	it( "logical XOR learning" , function() {
		
		var i , samples , sample , learningSample = 300 , x , y , output , error , errorList = [] , averageError = 0 ;
		
		var network = nk.createNetwork() ,
			inputX = nk.createSignalEmitter() ,
			inputY = nk.createSignalEmitter() ,
			hiddenNeuron1 = nk.createNeuron() ,
			hiddenNeuron2 = nk.createNeuron() ,
			outputNeuron = nk.createNeuron() ;
		
		network.addInput( 'x' , inputX ) ;
		network.addInput( 'y' , inputY ) ;
		network.addHiddenNeuron( hiddenNeuron1 ) ;
		network.addHiddenNeuron( hiddenNeuron2 ) ;
		network.addOutput( 'output' , outputNeuron ) ;
		
		inputX.connectTo( hiddenNeuron1 , 0 ) ;
		inputY.connectTo( hiddenNeuron1 , 0 ) ;
		inputX.connectTo( hiddenNeuron2 , 0 ) ;
		inputY.connectTo( hiddenNeuron2 , 0 ) ;
		
		hiddenNeuron1.connectTo( outputNeuron , 0 ) ;
		hiddenNeuron2.connectTo( outputNeuron , 0 ) ;
		
		samples = [
			{ x: 0 , y: 0 , expected: 0 } ,
			{ x: 0 , y: 1 , expected: 1 } ,
			{ x: 1 , y: 0 , expected: 1 } ,
			{ x: 1 , y: 1 , expected: 0 }
		] ;
		
		for ( i = 0 ; i < learningSample ; i ++ )
		{
			//console.log( "\n-------- #%s -------- f(x,y) = %sx + %sy + %s --------" , i , a , b , c ) ;
			//console.log( "Wx: %s , Wy: %s , bias: %s" , network.outputs.output.synapses[ 0 ].weight , network.outputs.output.synapses[ 1 ].weight , - network.outputs.output.bias ) ;
			
			sample = samples[ i % samples.length ] ;
			
			output = network.feedForward( sample ) ;
			
			error = sample.expected - output.output ;
			errorList.push( error ) ;
			
			console.log( "x: %s , y: %s , expected: %s , output: %s , error: %s" , sample.x , sample.y , sample.expected , output.output , error ) ;
			
			network.backwardCorrection( { output: sample.expected } ) ;
		}
		
		for ( i = learningSample - 20 ; i < learningSample ; i ++ ) { averageError += Math.abs( errorList[ i ] ) ; }
		averageError = averageError / 20 ;
		
		console.log( averageError ) ;
		
		expect( averageError ).to.be( 0 ) ;
	} ) ;
} ) ;



