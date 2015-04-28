#!/usr/bin/env node



var nk = require( '../lib/neuronsKit.js' ) ;
var term = require( 'terminal-kit' ).terminal ;



var network = nk.createNetwork() ;
	inputA = nk.createSignalEmitter() ,
	inputB = nk.createSignalEmitter() ,
	neuron = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ;

network.addInput( 'a' , inputA ) ;
network.addInput( 'b' , inputB ) ;
network.addOutput( 'output' , neuron ) ;

inputA.connectTo( neuron , 1 ) ;
inputB.connectTo( neuron , 1 ) ;

network.setInputSignals( {
	a: 0 ,
	b: 0
} ) ;

//console.log( '>>>>>' , network.inputs ) ;

console.log( '\nOutput: ' , network.getOutputSignal( 'output' ) ) ;



