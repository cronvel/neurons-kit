#!/usr/bin/env node



var nk = require( '../lib/neuronsKit.js' ) ;
var term = require( 'terminal-kit' ).terminal ;



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


