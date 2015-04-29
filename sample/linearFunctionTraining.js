#!/usr/bin/env node



var nk = require( '../lib/neuronsKit.js' ) ;
var term = require( 'terminal-kit' ).terminal ;

var i , x , y , output , a , b , c ;



var network = nk.createNetwork() ;
	inputX = nk.createSignalEmitter() ,
	inputY = nk.createSignalEmitter() ,
	neuron = nk.createNeuron( { transfer: 'linear' , threshold: 0 } ) ;

network.addInput( 'x' , inputX ) ;
network.addInput( 'y' , inputY ) ;
network.addOutput( 'output' , neuron ) ;

a = Math.floor( -10 + Math.random() * 21 ) ;
b = Math.floor( -10 + Math.random() * 21 ) ;
//c = Math.floor( 1 + Math.random() * 10 ) ;

inputX.connectTo( neuron , -10 + Math.random() * 20 ) ;
inputY.connectTo( neuron , -10 + Math.random() * 20 ) ;

console.log( "\nFunction wanted: f(x,y) = %sx+%sy\n" , a , b ) ;

for ( i = 0 ; i < 100 ; i ++ )
{
	console.log( "\n-------- #%s -------- f(x,y) = %sx+%sy --------" , i , a , b ) ;
	console.log( "Wx: %s , Wy: %s" , network.outputs.output.synapses[ 0 ].weight , network.outputs.output.synapses[ 1 ].weight  ) ;
	
	x = -10 + Math.random() * 20 ;
	y = -10 + Math.random() * 20 ;
	
	network.setInputSignals( { x: x , y: y } ) ;
	output = network.getOutputSignal( 'output' ) ;
	
	expected = a * x + b * y ;
	console.log( "x: %s , y: %s , expected: %s , output: %s" , x , y , expected , output ) ;
	
	network.outputs.output.backSignals = [ { signal: expected , weight: 1 } ] ;
	network.outputs.output.backwardSignal() ;
}

//console.log( '\nOutput: ' , network.getOutputSignal( 'output' ) ) ;



