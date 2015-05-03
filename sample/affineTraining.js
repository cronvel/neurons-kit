#!/usr/bin/env node



var nk = require( '../lib/neuronsKit.js' ) ;
var term = require( 'terminal-kit' ).terminal ;

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



