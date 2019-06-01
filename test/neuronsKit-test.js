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
	
	it( "logical AND learning" , function() {
		var samples , output , averageError ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			output = new nk.Neuron( { transfer: nk.tFn.relu } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( output , 'output' ) ;
		
		output.addInput( inputX ) ;
		output.addInput( inputY ) ;
		
		network.init() ;
		network.randomize() ;
		
		samples = [
			[ [ 0 , 0 ] , [ 0 ] ] ,
			[ [ 0 , 1 ] , [ 0 ] ] ,
			[ [ 1 , 0 ] , [ 0 ] ] ,
			[ [ 1 , 1 ] , [ 1 ] ]
		] ;
		
		averageError = network.train( samples , {
			maxRound: 2000 ,
			maxError: 0.01 ,
			slippy: true ,
			learningRate: 0.25 ,
			inertiaRate: 0.2
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.01 ) ;
	} ) ;
	
	it( "logical OR learning" , function() {
		var samples , output , averageError ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			output = new nk.Neuron( { transfer: nk.tFn.sigmoid } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( output , 'output' ) ;
		
		output.addInput( inputX ) ;
		output.addInput( inputY ) ;
		
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
			maxError: 0.01 ,
			slippy: true ,
			learningRate: 0.4 ,
			inertiaRate: 0.5
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.1 ) ;
	} ) ;
	
	it( "logical NAND learning" , function() {
		var samples , output , averageError ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			output = new nk.Neuron( { transfer: nk.tFn.sigmoid } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( output , 'output' ) ;
		
		output.addInput( inputX ) ;
		output.addInput( inputY ) ;
		
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
			maxError: 0.01 ,
			slippy: true ,
			learningRate: 0.6 ,
			inertiaRate: 0.5
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.1 ) ;
	} ) ;
	
	it( "logical NOR learning" , function() {
		var samples , output , averageError ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			output = new nk.Neuron( { transfer: nk.tFn.relu } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( output , 'output' ) ;
		
		output.addInput( inputX ) ;
		output.addInput( inputY ) ;
		
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
			maxError: 0.01 ,
			slippy: true ,
			learningRate: 0.4 ,
			inertiaRate: 0.5
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.1 ) ;
	} ) ;
	
	it( "identity and noise learning" , function() {
		// One input should pass through the output, the other input should be ignored
		
		var samples , output , averageError ;
		
		var network = new nk.Network() ,
			input = new nk.SignalEmitter() ,
			noise = new nk.SignalEmitter() ,
			output = new nk.Neuron( { transfer: nk.tFn.linear } ) ;
		
		network.addInput( input , 'input' ) ;
		network.addInput( noise , 'noise' ) ;
		network.addOutput( output , 'output' ) ;
		
		// Set the weight manually, we want the input to be low and noise high
		output.addInput( input , 0.5 ) ;
		output.addInput( noise , 2 ) ;
		
		network.init() ;
		
		samples = [
			[ [ 0 , 0 ] , [ 0 ] ] ,
			[ [ 0 , 1 ] , [ 0 ] ] ,
			[ [ 1 , 0 ] , [ 1 ] ] ,
			[ [ 1 , 1 ] , [ 1 ] ]
		] ;
		
		averageError = network.train( samples , {
			maxRound: 100 ,
			maxError: 0.001 ,
			learningRate: 0.4
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.05 ) ;
	} ) ;
	
	it( "Affine 'ax + b' learning" , function() {
		var samples = [] , output , averageError , sampleSize = 40 ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			output = new nk.Neuron( { transfer: nk.tFn.linear } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addOutput( output , 'output' ) ;
		
		output.addInput( inputX ) ;
		
		network.init() ;
		network.randomize() ;
		
		var a = Math.floor( -10 + Math.random() * 21 ) ;
		var b = Math.floor( -10 + Math.random() * 21 ) ;
		var x ;
		
		console.log( a + 'x' + ( b < 0 ? b : '+' + b ) ) ;
		
		while ( sampleSize -- ) {
			x = -10 + Math.random() * 20 ;
			samples.push( [ [ x ] , [ a * x + b ] ] ) ;
		}
		
		console.log( "Samples:" , samples ) ;
		
		averageError = network.train( samples , {
			maxRound: 40 ,
			maxError: 0.01 ,
			slippy: false ,
			learningRate: 0.25 ,
			inertiaRate: 0
		} ) ;
		
		console.log( a + 'x' + ( b < 0 ? b : '+' + b ) ) ;
		
		expect( averageError ).to.be.within( 0 , 0.1 ) ;
	} ) ;
	
	it( "Affine 'ax + by + c' learning" , function() {
		
		var samples = [] , output , averageError , sampleSize = 40 ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			output = new nk.Neuron( { transfer: nk.tFn.linear } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( output , 'output' ) ;
		
		output.addInput( inputX ) ;
		output.addInput( inputY ) ;
		
		network.init() ;
		network.randomize() ;
		
		var a = Math.floor( -10 + Math.random() * 21 ) ;
		var b = Math.floor( -10 + Math.random() * 21 ) ;
		var c = Math.floor( -10 + Math.random() * 21 ) ;
		var x , y ;
		
		console.log( a + 'x' + ( b < 0 ? b : '+' + b ) + 'y' + ( c < 0 ? c : '+' + c ) ) ;
		
		while ( sampleSize -- ) {
			x = -10 + Math.random() * 20 ;
			y = -10 + Math.random() * 20 ;
			samples.push( [ [ x , y ] , [ a * x + b * y + c ] ] ) ;
		}
		
		console.log( "Samples:" , samples ) ;
		
		averageError = network.train( samples , {
			maxRound: 40 ,
			maxError: 0.01 ,
			slippy: false ,
			learningRate: 0.25 ,
			inertiaRate: 0
		} ) ;
		
		console.log( a + 'x' + ( b < 0 ? b : '+' + b ) + 'y' + ( c < 0 ? c : '+' + c ) ) ;
		
		expect( averageError ).to.be.within( 0 , 0.1 ) ;
	} ) ;
	
	it( "Affine 'ax + by + cz + d' learning" , function() {
		
		var samples = [] , output , averageError , sampleSize = 40 ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			inputZ = new nk.SignalEmitter() ,
			output = new nk.Neuron( { transfer: nk.tFn.linear } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addInput( inputZ , 'z' ) ;
		network.addOutput( output , 'output' ) ;
		
		output.addInput( inputX ) ;
		output.addInput( inputY ) ;
		output.addInput( inputZ ) ;
		
		network.init() ;
		network.randomize() ;
		
		var a = Math.floor( -10 + Math.random() * 21 ) ;
		var b = Math.floor( -10 + Math.random() * 21 ) ;
		var c = Math.floor( -10 + Math.random() * 21 ) ;
		var d = Math.floor( -10 + Math.random() * 21 ) ;
		var x , y , z ;
		
		console.log( a + 'x' + ( b < 0 ? b : '+' + b ) + 'y' + ( c < 0 ? c : '+' + c ) + 'z' + ( d < 0 ? d : '+' + d ) ) ;
		
		while ( sampleSize -- ) {
			x = -10 + Math.random() * 20 ;
			y = -10 + Math.random() * 20 ;
			z = -10 + Math.random() * 20 ;
			samples.push( [ [ x , y , z ] , [ a * x + b * y + c * z + d ] ] ) ;
		}
		
		console.log( "Samples:" , samples ) ;
		
		averageError = network.train( samples , {
			maxRound: 40 ,
			maxError: 0.01 ,
			slippy: false ,
			learningRate: 0.25 ,
			inertiaRate: 0
		} ) ;
		
		console.log( a + 'x' + ( b < 0 ? b : '+' + b ) + 'y' + ( c < 0 ? c : '+' + c ) + 'z' + ( d < 0 ? d : '+' + d ) ) ;
		
		expect( averageError ).to.be.within( 0 , 0.1 ) ;
	} ) ;
} ) ;

	

describe( "Multiple neurons learning" , function() {
	
	it( "logical XOR1 learning" , function() {
		var samples , output , averageError ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			hiddenNeuron = new nk.Neuron( { transfer: nk.tFn.sigmoid.hard } ) ,
			output = new nk.Neuron( { transfer: nk.tFn.sigmoid.hard } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( output , 'output' ) ;
		network.addHidden( hiddenNeuron ) ;
		
		hiddenNeuron.addInput( inputX ) ;
		hiddenNeuron.addInput( inputY ) ;
		
		output.addInput( inputX ) ;
		output.addInput( inputY ) ;
		output.addInput( hiddenNeuron ) ;
		
		network.init() ;
		network.randomize() ;
		
		samples = [
			[ [ 0 , 0 ] , [ 0 ] ] ,
			[ [ 0 , 1 ] , [ 1 ] ] ,
			[ [ 1 , 0 ] , [ 1 ] ] ,
			[ [ 1 , 1 ] , [ 0 ] ]
		] ;
		
		averageError = network.train( samples , {
			maxRound: 2000 ,
			maxError: 0.05 ,
			slippy: false ,
			learningRate: 0.25 ,
			inertiaRate: 0.5
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.05 ) ;
	} ) ;
	
	it( "logical XOR2 learning" , function() {
		var samples , output , averageError ;
		var tFn = nk.tFn.sigmoid.hard ;
		//var tFn = nk.tFn.relu ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			h1 = new nk.Neuron( { transfer: tFn } ) ,
			h2 = new nk.Neuron( { transfer: tFn } ) ,
			output = new nk.Neuron( { transfer: nk.tFn.sigmoid.hard } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( output , 'output' ) ;
		network.addHidden( h1 ) ;
		network.addHidden( h2 ) ;
		
		h1.addInput( inputX ) ;
		h1.addInput( inputY ) ;
		h2.addInput( inputX ) ;
		h2.addInput( inputY ) ;
		output.addInput( h1 ) ;
		output.addInput( h2 ) ;
		
		network.init() ;
		network.randomize() ;
		
		samples = [
			[ [ 0 , 0 ] , [ 0 ] ] ,
			[ [ 0 , 1 ] , [ 1 ] ] ,
			[ [ 1 , 0 ] , [ 1 ] ] ,
			[ [ 1 , 1 ] , [ 0 ] ]
		] ;
		
		averageError = network.train( samples , {
			maxRound: 2000 ,
			maxError: 0.05 ,
			slippy: true ,
			learningRate: 0.25 ,
			inertiaRate: 0.2
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.05 ) ;
	} ) ;
	
	it( "logical XOR5 learning" , function() {
		var samples , output , averageError ;
		//var tFn = nk.tFn.sigmoid.hard ;
		var tFn = nk.tFn.relu ;
		
		var network = new nk.Network() ,
			inputX = new nk.SignalEmitter() ,
			inputY = new nk.SignalEmitter() ,
			h1 = new nk.Neuron( { transfer: tFn } ) ,
			h2 = new nk.Neuron( { transfer: tFn } ) ,
			h3 = new nk.Neuron( { transfer: tFn } ) ,
			h4 = new nk.Neuron( { transfer: tFn } ) ,
			h5 = new nk.Neuron( { transfer: tFn } ) ,
			output = new nk.Neuron( { transfer: tFn } ) ;
		
		network.addInput( inputX , 'x' ) ;
		network.addInput( inputY , 'y' ) ;
		network.addOutput( output , 'output' ) ;
		network.addHidden( h1 ) ;
		network.addHidden( h2 ) ;
		network.addHidden( h3 ) ;
		network.addHidden( h4 ) ;
		network.addHidden( h5 ) ;
		
		h1.addInput( inputX ) ;
		h1.addInput( inputY ) ;
		h2.addInput( inputX ) ;
		h2.addInput( inputY ) ;
		h3.addInput( inputX ) ;
		h3.addInput( inputY ) ;
		h4.addInput( inputX ) ;
		h4.addInput( inputY ) ;
		h5.addInput( inputX ) ;
		h5.addInput( inputY ) ;
		output.addInput( h1 ) ;
		output.addInput( h2 ) ;
		output.addInput( h3 ) ;
		output.addInput( h4 ) ;
		output.addInput( h5 ) ;
		
		network.init() ;
		network.randomize() ;
		
		samples = [
			[ [ 0 , 0 ] , [ 0 ] ] ,
			[ [ 0 , 1 ] , [ 1 ] ] ,
			[ [ 1 , 0 ] , [ 1 ] ] ,
			[ [ 1 , 1 ] , [ 0 ] ]
		] ;
		
		averageError = network.train( samples , {
			maxRound: 2000 ,
			maxError: 0.05 ,
			slippy: true ,
			learningRate: 0.25 ,
			inertiaRate: 0.2
		} ) ;
		
		expect( averageError ).to.be.within( 0 , 0.05 ) ;
	} ) ;
} ) ;

