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



const SignalEmitter = require( './SignalEmitter.js' ) ;
const Synapse = require( './Synapse.js' ) ;
const activationFunctions = require( './activationFunctions.js' ) ;

const Logfella = require( 'logfella' ) ;
const log = Logfella.global.use( 'neurons-kit' ) ;



function Neuron( options = {} ) {
	SignalEmitter.call( this , options ) ;
	
	this.activation = activationFunctions.relu ;
	
	if ( typeof options.activation === 'function' ) {
		this.activation = options.activation ;
	}
	else if ( typeof options.activation === 'string' && activationFunctions.BY_NAME[ options.activation ] ) {
		this.activation = activationFunctions.BY_NAME[ options.activation ] ;
	}
	
	this.bias = options.bias || 0 ;	// activation threshold = - bias
	this.correction = 0 ;	// correction for the bias
	this.correctionMomentum = 0 ;	// correction momentum for the bias
	this.synapses = [] ;
	this.innerSignal = 0 ;	// The inner signal before the transfer/activation function, useful to find out the derivative value, when back-propagating errorDelta

	//this.innerErrorDelta = 0 ;
	this.biasErrorDelta = 0 ;
	this.biasAdaptMomentum = 0 ;
}

Neuron.prototype = Object.create( SignalEmitter.prototype ) ;
Neuron.prototype.constructor = Neuron ;

module.exports = Neuron ;



Neuron.prototype.addInput = function( unit , weight ) {
	this.synapses.push( new Synapse( unit , weight ) ) ;
} ;



Neuron.prototype.addSynapse = function( synapse ) {
	if ( ! ( synapse instanceof Synapse ) ) {
		throw new Error( "Neuron#addSynapse(): should be a Synapse" ) ;
	}

	this.synapses.push( synapse ) ;
} ;



// Create the output signal from the input signals
Neuron.prototype.forwardSignal = function() {
	this.innerSignal = this.synapses.reduce( ( sum , synapse ) => sum + synapse.input.signal * synapse.weight , this.bias ) ;
	this.signal = this.activation( this.innerSignal ) ;

	/*
	var str = '' ;
	this.synapses.forEach( ( s , i ) => str += ' W' + i + ': ' + s.weight.toFixed( 5 ) ) ;
	log.debug( "FW Neuron --%s bias: %s -> %s -> %s" , str , this.bias.toFixed( 5 ) , this.innerSignal.toFixed( 5 ) , this.signal.toFixed( 5 ) ) ;
	//*/
} ;



// Create the errorDelta signals
Neuron.prototype.backwardErrorDelta = function( slippyDerivative = false ) {
	var derivated , innerErrorDelta , errorDeltaSum = 0 ;

	if ( ! this.errorDelta ) {
		//log.debug( "BW Neuron -- no error signal" ) ;
		return errorDeltaSum ;
	}

	if ( slippyDerivative ) {
		derivated = this.activation.derivative.slippy( this.innerSignal , -this.errorDelta ) ;
	}
	else {
		derivated = this.activation.derivative( this.innerSignal ) ;
	}

	innerErrorDelta = derivated * this.errorDelta ;

	//log.debug( "BW Neuron -- innerSignal %s derivated: %s errorDelta: %s innerErrorDelta: %s" , this.innerSignal.toFixed( 5 ) , derivated.toFixed( 5 ) , this.errorDelta.toFixed( 5 ) , innerErrorDelta.toFixed( 5 ) ) ;

	// The bias is like the weight of a synapse having 1 as input forever
	this.biasErrorDelta += innerErrorDelta ;
	errorDeltaSum += Math.abs( innerErrorDelta ) ;

	this.synapses.forEach( synapse => {
		var weightErrorDelta = innerErrorDelta * synapse.input.signal ;
		var inputErrorDelta = innerErrorDelta * synapse.weight ;
		errorDeltaSum += Math.abs( weightErrorDelta ) ;
		//log.debug( "  synapse errorDelta of weight: %s of input: %s" , weightErrorDelta.toFixed( 5 ) , inputErrorDelta.toFixed( 5 ) ) ;
		synapse.errorDelta += weightErrorDelta ;
		//synapse.input.errorDelta += synapseErrorDelta ;
		synapse.input.errorDelta += inputErrorDelta ;
	} ) ;

	return errorDeltaSum ;
} ;

