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

"use strict" ;



var nk = require( '..' ) ;



var network = new nk.Network() ,
	inputA = new nk.SignalEmitter() ,
	inputB = new nk.SignalEmitter() ,
	outputA = new nk.Neuron( { transfer: 'step' , threshold: 0 } ) ,
	outputB = new nk.Neuron( { transfer: 'step' , threshold: 0 } ) ;

var	hidden11 = new nk.Neuron( { transfer: 'step' , threshold: 0 } ) ,
	hidden12 = new nk.Neuron( { transfer: 'step' , threshold: 0 } ) ;

var	hidden21 = new nk.Neuron( { transfer: 'step' , threshold: 0 } ) ,
	hidden22 = new nk.Neuron( { transfer: 'step' , threshold: 0 } ) ;

network.addInput( inputA , 'a' ) ;
network.addInput( inputB , 'b' ) ;
network.addOutput( outputA , 'outputA' , outputA ) ;
network.addOutput( outputB , 'outputB' , outputB ) ;
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

outputA.addInput( hidden21 , 1 ) ;
outputA.addInput( hidden22 , 1 ) ;
outputB.addInput( hidden21 , 1 ) ;
outputB.addInput( hidden22 , 1 ) ;

network.computeUnitOrder() ;

console.log( network.orderedUnits.indexOf( hidden11 ) ) ;
console.log( network.orderedUnits.indexOf( hidden12 ) ) ;
console.log( network.orderedUnits.indexOf( hidden21 ) ) ;
console.log( network.orderedUnits.indexOf( hidden22 ) ) ;
console.log( network.orderedUnits.indexOf( outputA ) ) ;
console.log( network.orderedUnits.indexOf( outputB ) ) ;

/*
network.setInputSignals( {
	a: 0 ,
	b: 0
} ) ;

//console.log( '>>>>>' , network.inputs ) ;

console.log( '\nOutput: ' , network.getOutputSignal( 'output' ) ) ;
*/


