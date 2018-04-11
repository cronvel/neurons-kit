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
var Neuron = require( './Neuron.js' ) ;



function Network( /* options */ ) {
	this.ready = false ;
	this.namedInputUnits = {} ;
	this.namedOutputUnits = {} ;
	this.inputUnits = [] ;	// input neurons/signal
	this.outputUnits = [] ;	// output neurons
	this.hiddenUnits = [] ;	// hidden neurons
	this.orderedUnits = [] ;	// ordered hiddenUnits + outputUnits
}

module.exports = Network ;



Network.prototype.addInput = function addInput( input , name ) {
	if ( ! ( input instanceof SignalEmitter ) ) {
		name = input ;
		input = new SignalEmitter() ;
	}

	this.inputUnits.push( input ) ;

	if ( name ) {
		this.namedInputUnits[ name ] = input ;
	}

	this.ready = false ;
} ;



Network.prototype.addOutput = function addOutput( output , name ) {
	if ( ! ( output instanceof SignalEmitter ) ) {
		name = output ;
		output = new Neuron() ;
	}

	this.outputUnits.push( output ) ;

	if ( name ) {
		this.namedOutputUnits[ name ] = output ;
	}

	this.ready = false ;
} ;



Network.prototype.addHidden = function addHidden( unit ) {
	if ( ! ( unit instanceof SignalEmitter ) ) {
		unit = new Neuron() ;
	}

	this.hiddenUnits.push( unit ) ;
	this.ready = false ;
} ;



Network.prototype.setInputs = function setInputs( inputs ) {
	var i , iMax = Math.min( inputs.length , this.inputUnits.length ) ;

	for ( i = 0 ; i < iMax ; i ++ ) {
		this.inputUnits[ i ].signal = inputs[ i ] ;
	}
} ;



Network.prototype.setNamedInputs = function setNamedInputs( namedInputs ) {
	var name ;

	for ( name in namedInputs ) {
		if ( this.namedInputUnits[ name ] ) {
			this.namedInputUnits[ name ].signal = namedInputs[ name ] ;
		}
	}
} ;



Network.prototype.getOutputs = function getOutputs() {
	return this.outputUnits.map( output => output.signal ) ;
} ;



Network.prototype.getNamedOuputs = function getNamedOutputs() {
	var name , output = {} ;

	for ( name in this.namedOutputUnits ) {
		output[ name ] = this.namedOutputUnits[ name ].signal ;
	}

	return output ;
} ;



Network.prototype.setOutputFeedbacks = function setOutputFeedbacks( feedbacks , isBackSignal ) {
	var i , iMax = Math.min( feedbacks.length , this.outputUnits.length ) ;
	
	if ( isBackSignal ) {
		for ( i = 0 ; i < iMax ; i ++ ) {
			this.outputUnits[ i ].backSignal = feedbacks[ i ] ;
		}
	}
	else {
		for ( i = 0 ; i < iMax ; i ++ ) {
			this.outputUnits[ i ].backSignal = feedbacks[ i ] - this.outputUnits[ i ].signal ;
			console.log( "setOutputFeedbacks:" , feedbacks[ i ] , this.outputUnits[ i ].signal , this.outputUnits[ i ].backSignal ) ;
		}
	}
} ;



Network.prototype.setNamedOutputFeedbacks = function setNamedOutputFeedbacks( namedFeedbacks , isBackSignal ) {
	var name ;

	if ( isBackSignal ) {
		for ( name in namedFeedbacks ) {
			if ( this.namedOutputUnits[ name ] ) {
				this.namedOutputUnits[ name ].backSignal = namedFeedbacks[ name ] ;
			}
		}
	}
	else {
		for ( name in namedFeedbacks ) {
			if ( this.namedOutputUnits[ name ] ) {
				this.namedOutputUnits[ name ].backSignal = namedFeedbacks[ name ] - this.namedOutputUnits[ name ].signal ;
			}
		}
	}
} ;



Network.prototype.init =
Network.prototype.computeUnitOrder = function computeUnitOrder() {
	if ( this.ready ) { return ; }

	var unit , lastSize ;

	this.orderedUnits.length = 0 ;

	var determined = new Set( this.inputUnits ) ;
	var remaining = new Set( this.hiddenUnits.concat( this.outputUnits ) ) ;

	while ( remaining.size ) {
		if ( remaining.size === lastSize ) {
			throw new Error( "Bad network (cyclic or with external references)" ) ;
		}

		lastSize = remaining.size ;

		for ( unit of remaining ) {
			if ( unit.synapses.every( synapse => determined.has( synapse.input ) ) ) {
				this.orderedUnits.push( unit ) ;
				determined.add( unit ) ;
				remaining.delete( unit ) ;
			}
		}
	}

	this.ready = true ;
} ;



Network.prototype.forwardSignal = function forwardSignal() {
	this.orderedUnits.forEach( unit => unit.forwardSignal() ) ;
} ;



Network.prototype.forwardCycle = function forwardCycle( inputs ) {
	if ( ! this.ready ) { this.init() ; }

	if ( Array.isArray( inputs ) ) { this.setInputs( inputs ) ; }
	else { this.setNamedInputs( inputs ) ; }

	this.forwardSignal() ;

	return this.getOutputs() ;
} ;



Network.prototype.backwardSignal = function backwardSignal( leakRate = 0 ) {
	var i = this.orderedUnits.length ;

	while ( i -- ) {
		this.orderedUnits[ i ].backwardSignal( leakRate ) ;
	}
} ;



Network.prototype.backwardCycle = function backwardCycle( feedbacks , leakRate = 0 , isBackSignal = false ) {
	if ( ! this.ready ) { this.init() ; }

	if ( Array.isArray( feedbacks ) ) { this.setOutputFeedbacks( feedbacks , isBackSignal ) ; }
	else { this.setNamedOutputFeedbacks( feedbacks , isBackSignal ) ; }

	this.backwardSignal( leakRate ) ;
} ;



Network.prototype.applyCorrection = function applyCorrection( learningRate = 0.5 , inertiaRate = 0 ) {
	var feedbackNorm , correctionNorm = 0 , inputNorm = 0 ,
		correctionRate = 0 ,
		dynamicRate = 1 - inertiaRate ;

	if ( ! this.ready ) { this.init() ; }

	// First compute the vectors norm
	feedbackNorm = Math.sqrt( this.outputUnits.reduce( ( sum , unit ) => sum + unit.backSignal * unit.backSignal , 0 ) ) ;
	
	if ( feedbackNorm ) {
		this.orderedUnits.forEach( unit => {
			// For the bias
			correctionNorm += unit.correction * unit.correction ;
			inputNorm ++ ;	// the bias signal value is always 1

			// For each synapse
			unit.synapses.forEach( synapse => {
				correctionNorm += synapse.correction * synapse.correction ;
				inputNorm += synapse.input.signal * synapse.input.signal ;
			} ) ;
		} ) ;

		correctionNorm = Math.sqrt( correctionNorm ) ;
		inputNorm = Math.sqrt( inputNorm ) ;
		
		correctionRate = learningRate * feedbackNorm / ( correctionNorm * inputNorm ) || 0 ;
		if ( correctionRate > 1000000 ) { correctionRate = 1000000 ; }
		
		console.log( "Norms:" , feedbackNorm , correctionNorm , inputNorm ) ;
	}
	
	console.log( "correctionRate:" , correctionRate ) ;
	
	// Now apply the correction...
	this.orderedUnits.forEach( unit => {
		// For the bias
		unit.correctionMomentum = dynamicRate * unit.correction * correctionRate + inertiaRate * unit.correctionMomentum ;
		unit.bias += unit.correctionMomentum ;
		unit.correction = 0 ;

		// For each synapse
		unit.synapses.forEach( synapse => {
			synapse.correctionMomentum = dynamicRate * synapse.correction * correctionRate + inertiaRate * synapse.correctionMomentum ;
			synapse.weight += synapse.correctionMomentum ;
			synapse.correction = 0 ;
		} ) ;
	} ) ;
} ;



Network.prototype.resetCorrection = function resetCorrection() {
	this.orderedUnits.forEach( unit => {
		unit.correctionMomentum = 0 ;
		unit.correction = 0 ;

		unit.synapses.forEach( synapse => {
			synapse.correctionMomentum = 0 ;
			synapse.correction = 0 ;
		} ) ;
	} ) ;
} ;



var random = ( min , max ) => min + Math.random() * ( max - min ) ;

Network.prototype.randomize = function randomize( min = -1 , max = 1 ) {
	this.orderedUnits.forEach( unit => {
		unit.bias = random( min , max ) ;
		unit.synapses.forEach( synapse => synapse.weight = random( min , max ) ) ;
	} ) ;
} ;


