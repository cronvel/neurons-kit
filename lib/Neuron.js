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



var SignalEmitter = require( './SignalEmitter.js' ) ;
var Synapse = require( './Synapse.js' ) ;
var transferFunctions = require( './transferFunctions.js' ) ;



function Neuron( options = {} ) {
	SignalEmitter.call( this ) ;
	this.transfer = options.transfer || transferFunctions.relu ;
	this.bias = options.bias || 0 ;	// activation threshold = - bias
	this.correction = 0 ;	// correction for the bias
	this.correctionMomentum = 0 ;	// correction momentum for the bias
	this.synapses = [] ;
	this.innerSignal = 0 ;	// The inner signal before the transfer function
}

Neuron.prototype = Object.create( SignalEmitter.prototype ) ;
Neuron.prototype.constructor = Neuron ;

module.exports = Neuron ;



Neuron.prototype.addSynapse = function addSynapse( synapse ) {
	if ( ! ( synapse instanceof Synapse ) ) {
		throw new Error( "Neuron#addSynapse(): should be a Synapse" ) ;
	}

	this.synapses.push( synapse ) ;
} ;



Neuron.prototype.addInput = function addSynapse( unit , weight ) {
	this.synapses.push( new Synapse( unit , weight ) ) ;
} ;



// Create the output signal from the input signals
Neuron.prototype.forwardSignal = function forwardSignal() {
	this.innerSignal = this.synapses.reduce( ( sum , synapse ) => sum + synapse.input.signal * synapse.weight , this.bias ) ;
	this.signal = this.transfer( this.innerSignal ) ;
} ;



// Create the output signal from the input signals
Neuron.prototype.backwardSignal = function backwardSignal( leakRate = 0 ) {
	var derivated = ( ( leakRate && this.transfer.leakyDerivative ) || this.transfer.derivative )( this.innerSignal ) ;
	
	// Negative form is used to catch NaN
	if ( ! ( Math.abs( derivated ) >= leakRate ) ) {
		derivated = derivated < 0 ? - leakRate : leakRate ;
	}
	
	var backSignal = derivated * this.backSignal ;
	
	console.log( "backSignal:" , backSignal ) ;
	
	// The bias is like the weight of a synapse having 1 as input forever
	this.correction += backSignal ;
	
	this.synapses.forEach( synapse => {
		var synapseBackSignal = backSignal * synapse.input.signal ;
		synapse.correction += synapseBackSignal ;
		synapse.input.backSignal += synapseBackSignal ;
	} ) ;
} ;


