#!/usr/bin/env node
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
var nk = require( '../lib/neuronsKit.js' ) ;



var network = nk.createNetwork() ;
	inputA = nk.createSignalEmitter() ,
	inputB = nk.createSignalEmitter() ,
	outputA = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ,
	outputB = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ;

var	hidden21 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ,
	hidden22 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ;

var	hidden11 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ,
	hidden12 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ;

network.addInput( 'a' , inputA ) ;
network.addInput( 'b' , inputB ) ;
network.addOutput( 'outputA' , outputA ) ;
network.addOutput( 'outputB' , outputB ) ;
network.addHiddenNeuron( hidden21 ) ;
network.addHiddenNeuron( hidden22 ) ;
network.addHiddenNeuron( hidden11 ) ;
network.addHiddenNeuron( hidden12 ) ;

inputA.connectTo( hidden11 , 1 ) ;
inputA.connectTo( hidden12 , 1 ) ;
inputB.connectTo( hidden11 , 1 ) ;
inputB.connectTo( hidden12 , 1 ) ;

hidden11.connectTo( hidden21 , 1 ) ;
hidden11.connectTo( hidden22 , 1 ) ;
hidden12.connectTo( hidden21 , 1 ) ;
hidden12.connectTo( hidden22 , 1 ) ;

hidden21.connectTo( outputA , 1 ) ;
hidden21.connectTo( outputB , 1 ) ;
hidden22.connectTo( outputA , 1 ) ;
hidden22.connectTo( outputB , 1 ) ;

network.feedForwardOrder() ;

console.log( network.neuronOrder.indexOf( hidden11 ) ) ;
console.log( network.neuronOrder.indexOf( hidden12 ) ) ;
console.log( network.neuronOrder.indexOf( hidden21 ) ) ;
console.log( network.neuronOrder.indexOf( hidden22 ) ) ;
console.log( network.neuronOrder.indexOf( outputA ) ) ;
console.log( network.neuronOrder.indexOf( outputB ) ) ;

/*
network.setInputSignals( {
	a: 0 ,
	b: 0
} ) ;

//console.log( '>>>>>' , network.inputs ) ;

console.log( '\nOutput: ' , network.getOutputSignal( 'output' ) ) ;
*/


