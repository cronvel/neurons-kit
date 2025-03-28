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

	this.bias = options.bias || 0 ;	// activation threshold = - bias
	this.synapses = [] ;
	this.innerSignal = 0 ;	// The inner signal before the transfer/activation function, useful to find out the derivative value, when back-propagating correctionSignal

	//this.innerCorrectionSignal = 0 ;
	this.biasCorrection = 0 ;
	this.biasCorrectionMomentum = 0 ;

	/*
		Isomorphism: associate for each named isomorphic transformation (key) another Neuron instance.
		It intertweens neurons so changing a bias or input weight change it for all isomorphic neurons.
		Creating connections between two neurons also create connections between each pair of isomorphs.
		Useful when there are some symmetry axis in sensors and/or outputs, e.g. for board game.
		Also it's probably best to move that to the base SignalEmitter class because inputs are not
		neurons, just SignalEmitters.
	*/
	//this.isomorphs = {} ;

	if ( options.activation ) { this.setActivation( options.activation ) ; }
}

Neuron.prototype = Object.create( SignalEmitter.prototype ) ;
Neuron.prototype.constructor = Neuron ;

module.exports = Neuron ;



Neuron.prototype.debugData = function() {
	return {
		id: this.id ,
		a: this.activation.id ,
		b: this.bias ,
		s: this.synapses.map( s => ( {
			i: s.input.id ,
			w: s.weight
		} ) )
	} ;
} ;



Neuron.prototype.addInput = function( unit , weight ) {
	this.synapses.push( new Synapse( unit , weight ) ) ;
} ;



Neuron.prototype.addSynapse = function( synapse ) {
	if ( ! ( synapse instanceof Synapse ) ) {
		throw new Error( "Neuron#addSynapse(): should be a Synapse" ) ;
	}

	this.synapses.push( synapse ) ;
} ;



Neuron.prototype.removeSynapse = function( synapse ) {
	var indexOf = this.synapses.indexOf( synapse ) ;
	if ( indexOf >= 0 ) { this.synapses.splice( indexOf , 1 ) ; }
} ;



Neuron.prototype.removeInput = function( unit ) {
	var indexOf = this.synapses.findIndex( s => s.input === unit ) ;
	if ( indexOf >= 0 ) { this.synapses.splice( indexOf , 1 ) ; }
} ;



Neuron.prototype.getSynapseById = function( id ) {
	return this.synapses.find( s => s.input.id === id ) ;
} ;



// Set activation function, return true if it changed
Neuron.prototype.setActivation = function( activation ) {
	if ( typeof activation === 'string' && activationFunctions.BY_NAME[ activation ] ) {
		activation = activationFunctions.BY_NAME[ activation ] ;
	}

	if ( typeof activation === 'function' && this.activation !== activation ) {
		this.activation = activation ;
		return true ;
	}

	return false ;
} ;



// Return true if the argument unit is an input of the current neuron
Neuron.prototype.hasInput = function( unit ) { return this.synapses.some( s => s.input === unit ) ; } ;



// Create the output signal from the input signals
Neuron.prototype.forwardSignal = function() {
	// Critical: should be fast...
	//this.innerSignal = this.synapses.reduce( ( sum , synapse ) => sum + synapse.input.signal * synapse.weight , this.bias ) ;

	var synapse ,
		sum = this.bias ,
		i = 0 ,
		iMax = this.synapses.length ;

	for ( ; i < iMax ; i ++ ) {
		synapse = this.synapses[ i ] ;
		sum += synapse.input.signal * synapse.weight ;
	}

	this.innerSignal = sum ;
	this.signal = this.activation( this.innerSignal ) ;

	/*
	var str = '' ;
	this.synapses.forEach( ( s , i ) => str += ' W' + i + ': ' + s.weight.toFixed( 5 ) ) ;
	log.debug( "FW Neuron --%s bias: %s -> %s -> %s" , str , this.bias.toFixed( 5 ) , this.innerSignal.toFixed( 5 ) , this.signal.toFixed( 5 ) ) ;
	//*/
} ;



// Create the correctionSignal signals
Neuron.prototype.backwardCorrectionSignal = function( slippyDerivative = false ) {
	var derivated , innerCorrectionSignal , correctionSum = 0 ;

	if ( ! this.correctionSignal ) {
		//log.debug( "BW Neuron -- no error signal" ) ;
		return correctionSum ;
	}

	if ( slippyDerivative ) {
		derivated = this.activation.derivative.slippy( this.innerSignal , this.correctionSignal ) ;
	}
	else {
		derivated = this.activation.derivative( this.innerSignal ) ;
	}

	innerCorrectionSignal = derivated * this.correctionSignal ;

	//log.debug( "BW Neuron -- innerSignal %s derivated: %s correctionSignal: %s innerCorrectionSignal: %s" , this.innerSignal.toFixed( 5 ) , derivated.toFixed( 5 ) , this.correctionSignal.toFixed( 5 ) , innerCorrectionSignal.toFixed( 5 ) ) ;

	// The bias is like the weight of a synapse having 1 as input forever
	this.biasCorrection += innerCorrectionSignal ;
	correctionSum += Math.abs( innerCorrectionSignal ) ;

	this.synapses.forEach( synapse => {
		var weightCorrection = innerCorrectionSignal * synapse.input.signal ;
		var inputCorrectionSignal = innerCorrectionSignal * synapse.weight ;
		correctionSum += Math.abs( weightCorrection ) ;
		//log.debug( "  synapse correction of weight: %s of input: %s" , weightCorrection.toFixed( 5 ) , inputCorrectionSignal.toFixed( 5 ) ) ;
		synapse.correction += weightCorrection ;
		synapse.input.correctionSignal += inputCorrectionSignal ;
	} ) ;

	return correctionSum ;
} ;



/*
	Mandatory:
		weightDelta: the maximum delta for random changes
*/
Neuron.prototype.mutateOneWeight = function( mutation ) {
	var synapse , delta ,
		index = Math.floor( ( 1 + this.synapses.length ) * Math.random() ) ;

	if ( index === this.synapses.length ) {
		// So we mutate the bias
		delta = mutation.mutateBias( this.bias ) ;
		this.bias += delta ;
		return [ 'bias' , delta ] ;
	}

	// Here we mutate a synapse (a connection)
	synapse = this.synapses[ index ] ;
	delta = mutation.mutateWeight( synapse.weight ) ;
	synapse.weight += delta ;
	return [ synapse.input.id , delta ] ;
} ;

