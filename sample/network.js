#!/usr/bin/env node
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



const nk = require( '..' ) ;



var network = new nk.Network() ,
	inputA = new nk.SignalEmitter() ,
	inputB = new nk.SignalEmitter() ,
	outputA = new nk.Neuron( { activation: nk.aFn.sigmoid.hard } ) ,
	outputB = new nk.Neuron( { activation: nk.aFn.sigmoid.hard } ) ;

var	hidden11 = new nk.Neuron( { activation: 'step' } ) ,
	hidden12 = new nk.Neuron( { activation: 'step' } ) ;

var	hidden21 = new nk.Neuron( { activation: 'step' } ) ,
	hidden22 = new nk.Neuron( { activation: 'step' } ) ;

network.addInput( inputA , 'a' ) ;
network.addInput( inputB , 'b' ) ;
network.addOutputUnit( outputA , 'outputA' ) ;
network.addOutputUnit( outputB , 'outputB' ) ;
network.addHiddenUnit( hidden21 ) ;
network.addHiddenUnit( hidden22 ) ;
network.addHiddenUnit( hidden11 ) ;
network.addHiddenUnit( hidden12 ) ;

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

network.init() ;
network.randomize() ;

console.log( network.orderedUnits.indexOf( hidden11 ) ) ;
console.log( network.orderedUnits.indexOf( hidden12 ) ) ;
console.log( network.orderedUnits.indexOf( hidden21 ) ) ;
console.log( network.orderedUnits.indexOf( hidden22 ) ) ;
console.log( network.orderedUnits.indexOf( outputA ) ) ;
console.log( network.orderedUnits.indexOf( outputB ) ) ;

network.setNamedInputs( {
	a: 10 ,
	b: 0
} ) ;

//console.log( '>>>>>' , network ) ;
network.forwardSignal() ;

console.log( '\nOutput: ' , network.getOutputs() ) ;


