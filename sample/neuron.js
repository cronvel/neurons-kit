#!/usr/bin/env node



var nk = require( '../lib/neuronsKit.js' ) ;


var neuron = nk.createNeuron( { transfer: 'step' } ) ;

var input1 = nk.createSignalEmitter() ,
	input2 = nk.createSignalEmitter() ;

input1.connectTo( neuron , 1 ) ;
input2.connectTo( neuron , -2 ) ;

input1.signal = 2.4999 ;
input2.signal = 1 ;

neuron.forwardSignal() ;

console.log( neuron.signal ) ;



