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
	
	//this.innerErrorDelta = 0 ;
	this.biasErrorDelta = 0 ;
	this.biasAdaptMomentum = 0 ;
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
	
	//*
	var str = '' ;
	this.synapses.forEach( ( s , i ) => str += ' W' + i + ': ' + s.weight.toFixed( 5 ) ) ;
	console.log( "FW Neuron --%s bias: %s -> %s" , str , this.bias.toFixed( 5 ) , this.signal.toFixed( 5 ) ) ;
	//*/
} ;



// Create the output signal from the input signals
Neuron.prototype.backwardSignal = function backwardSignal( slippyDerivative = false ) {
	var derivated = ( slippyDerivative ? this.transfer.derivative.slippy : this.transfer.derivative )( this.innerSignal ) ;
	//var derivated = this.transfer.derivative( this.innerSignal ) ;
	
	var innerBackSignal = derivated * this.backSignal ;
	
	console.log( "BW Neuron -- innerSignal" , this.innerSignal.toFixed( 5 ) , "derivated:" , derivated.toFixed( 5 ) , "backSignal:" , this.backSignal.toFixed( 5 ) , "innerBackSignal:" , innerBackSignal.toFixed( 5 ) ) ;
	
	// The bias is like the weight of a synapse having 1 as input forever
	this.correction += innerBackSignal ;
	
	this.synapses.forEach( synapse => {
		var synapseBackSignal = innerBackSignal * synapse.input.signal ;
		console.log( "  synapseBackSignal:" , synapseBackSignal ) ;
		synapse.correction += synapseBackSignal ;
		synapse.input.backSignal += synapseBackSignal ;
	} ) ;
} ;



// Create the output signal from the input signals
Neuron.prototype.backwardErrorDelta = function backwardErrorDelta( slippyDerivative = false ) {
	var derivated = ( slippyDerivative ? this.transfer.derivative.slippy : this.transfer.derivative )( this.innerSignal ) ;
	//var derivated = this.transfer.derivative( this.innerSignal ) ;
	
	var innerErrorDelta = derivated * this.errorDelta ;
	
	console.log( "BW Neuron -- innerSignal" , this.innerSignal.toFixed( 5 ) , "derivated:" , derivated.toFixed( 5 ) , "errorDelta:" , this.errorDelta.toFixed( 5 ) , "innerErrorDelta:" , innerErrorDelta.toFixed( 5 ) ) ;
	
	// The bias is like the weight of a synapse having 1 as input forever
	this.biasErrorDelta += innerErrorDelta ;
	
	this.synapses.forEach( synapse => {
		var synapseErrorDelta = innerErrorDelta * synapse.input.signal ;
		console.log( "  synapseErrorDelta:" , synapseErrorDelta ) ;
		synapse.errorDelta += synapseErrorDelta ;
		synapse.input.errorDelta += synapseErrorDelta ;
	} ) ;
} ;


