#!/usr/bin/env node



var nk = require( '../lib/neuronsKit.js' ) ;
var term = require( 'terminal-kit' ).terminal ;



var network = nk.createNetwork() ;
	inputA = nk.createSignalEmitter() ,
	inputB = nk.createSignalEmitter() ,
	outputA = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ,
	outputB = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ,
	hidden1 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ,
	hidden2 = nk.createNeuron( { transfer: 'step' , threshold: 0 } ) ;

network.addInput( 'a' , inputA ) ;
network.addInput( 'b' , inputB ) ;
network.addOutput( 'outputA' , outputA ) ;
network.addOutput( 'outputB' , outputB ) ;
network.addHiddenNeuron( hidden1 ) ;
network.addHiddenNeuron( hidden2 ) ;

inputA.connectTo( hidden1 , 1 ) ;
inputA.connectTo( hidden2 , 1 ) ;
inputB.connectTo( hidden1 , 1 ) ;
inputB.connectTo( hidden2 , 1 ) ;

hidden1.connectTo( outputA , 1 ) ;
hidden1.connectTo( outputB , 1 ) ;
hidden2.connectTo( outputA , 1 ) ;
hidden2.connectTo( outputB , 1 ) ;

network.feedForwardOrder() ;

console.log( network.neuronOrder.indexOf( hidden1 ) ) ;
console.log( network.neuronOrder.indexOf( hidden2 ) ) ;
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


