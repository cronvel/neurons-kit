#!/usr/bin/env node
/*
	Neurons Kit

	Copyright (c) 2015 - 2019 Cédric Ronvel

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

var i , x , y , output , a , b , c ;



var network = nk.createNetwork() ;
	inputX = nk.createSignalEmitter() ,
	inputY = nk.createSignalEmitter() ,
	neuron = nk.createNeuron( { transfer: 'linear' , threshold: -10 + Math.random() * 20 } ) ;

network.addInput( 'x' , inputX ) ;
network.addInput( 'y' , inputY ) ;
network.addOutput( 'output' , neuron ) ;

a = Math.floor( -10 + Math.random() * 21 ) ;
b = Math.floor( -10 + Math.random() * 21 ) ;
constant = Math.floor( -10 + Math.random() * 21 ) ;

inputX.connectTo( neuron , -10 + Math.random() * 20 ) ;
inputY.connectTo( neuron , -10 + Math.random() * 20 ) ;

//network.feedForwardOrder() ;

console.log( "\nFunction wanted: f(x,y) = %sx+%sy\n" , a , b ) ;

for ( i = 0 ; i < 100 ; i ++ )
{
	console.log( "\n-------- #%s -------- f(x,y) = %sx + %sy + %s --------" , i , a , b , constant ) ;
	console.log( "Wx: %s , Wy: %s , bias: %s" ,
		network.outputs.output.synapses[ 0 ].weight ,
		network.outputs.output.synapses[ 1 ].weight ,
		- network.outputs.output.threshold ) ;
	
	x = -10 + Math.random() * 20 ;
	y = -10 + Math.random() * 20 ;
	
	output = network.feedForward( { x: x , y: y } ) ;
	
	expected = a * x + b * y + constant ;
	console.log( "x: %s , y: %s , expected: %s , output: %s , error: %s" , x , y , expected , output.output , expected - output.output ) ;
	
	/*
	network.outputs.output.backSignals = [ { signal: expected , weight: 1 } ] ;
	network.outputs.output.backwardSignal() ;
	*/
	network.backwardCorrection( { output: expected } ) ;
}

//console.log( '\nOutput: ' , network.getOutputSignal( 'output' ) ) ;



