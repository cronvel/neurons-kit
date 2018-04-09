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
var transferFunctions = require( './transferFunctions.js' ) ;



function Neuron( options = {} ) {
	SignalEmitter.call( this ) ;
	this.transfer = options.transfer || transferFunctions.leakyRelu ;
	this.bias = options.bias || 0 ;	// activation threshold = - bias
	this.synapses = [] ;
} ;

Neuron.prototype = Object.create( SignalEmitter.prototype ) ;
Neuron.prototype.constructor = Neuron ;



// Create the output signal from the input signals
Neuron.prototype.forwardSignal = function forwardSignal( networkRecursive ) {
	this.signal = this.transfer(
		this.synapses.reduce( ( sum , synapse ) => sum + synapse.input.signal * synapse.weight , this.bias ) ;
	) ;
} ;

//# debugForwardSignal : var debugForwardSignalCount = 0 ;



// /!\ Back signals should be reset network-wide before calling this
/*
// Create the backward input back-signal from the output back-signal
Neuron.prototype.backwardSignal = function backwardSignal() {
	var i , tmp , backSignal , error , rootSignal , rootBackSignal ,
		bias , biasInput , biasWeight ,
		weightSum , weightAverage , inputSum , inputAverage ,
		input , weight , adjustementRate , currentAdjustementRate ,
		// iw: synpase Input * Weight
		iwCount , iw , iwCorrected , iwAverageError ;

	//# debugBackwardSignal : console.error( "\n--- .backwardSignal() #%s ---" , debugBackwardSignalCount ++ ) ;

	// No backSignal to backward propagate, something was wrong somewhere...
	if ( ! this.backSignals.length ) { return ; }



	// First compute a unique backSignal, from the weighted backSignals

	weightSum = 0 ;
	backSignal = 0 ;
	//console.log( this.backSignals ) ;

	for ( i = 0 ; i < this.backSignals.length ; i ++ ) {
		backSignal = this.backSignals[ i ].signal * this.backSignals[ i ].weight ;
		weightSum += this.backSignals[ i ].weight ;
	}

	// No weight, no backward signal
	if ( weightSum === 0 ) { return ; }

	//# debugBackwardSignal : console.error( "signal: %s , backSignal: %s , weightSum: %s" , this.signal , backSignal , weightSum ) ;
	backSignal /= weightSum ;

	if ( this.signal === backSignal ) {
		// It's ok: backSignal === signal
		// Things to do with function that do not have inverse at all (step, rectifier, etc)
	}


	// Then compute the rootSignal and rootBackSignal: the signal before the transfer function and scaling,
	// Those root signal are simply a linear combination of all synpase channels.

	rootBackSignal = this.transfer.inverse( backSignal ) ;
	rootBackSignal /= this.scale ;

	rootSignal = this.transfer.inverse( this.signal ) ;
	rootSignal /= this.scale ;


	// Now we have the error
	error = rootBackSignal - rootSignal ;

	//# debugBackwardSignal : console.error( "rootBackSignal: %s , rootSignal: %s , error: %s" , rootBackSignal , rootSignal , error ) ;


	// The neurone threshold is mathematically like another synapse channel.
	// Other implementation have a "bias" pseudo-input. We will guess it from the threshold.
	// For now, we will assume that the input part and the weight part are (absolutely) equals

	bias = -this.threshold ;

	if ( bias > 0 ) {
		biasInput = Math.sqrt( bias ) ;
		biasWeight = biasInput ;
	}
	else if ( bias < 0 ) {
		biasInput = Math.sqrt( -bias ) ;
		biasWeight = -biasInput ;
	}
	else {
		// BiasInput should not be 0, or the bias cannot change anymore
		biasInput = 0.001 ;
		biasWeight = 0 ;
	}

	//# debugBackwardSignal : console.error( "threshold: %s , bias input: %s , bias weight: %s" , this.threshold , biasInput , biasWeight ) ;


	// Pre-compute weight, absolute sum and average absolute for each synapse

	iwCount = this.synapses.length + 1 ;	// synapse + the bias
	inputSum = biasInput ;
	weightSum = biasWeight ;

	//inputSum = weightSum = 0 ; iwCount -- ;

	for ( i = 0 ; i < this.synapses.length ; i ++ ) {
		inputSum += Math.abs( this.synapses[ i ].emitter.signal ) ;
		weightSum += Math.abs( this.synapses[ i ].weight ) ;
	}

	inputAverage = inputSum / iwCount ;
	weightAverage = weightSum / iwCount ;
	iwAverageError = error / iwCount ;

	// cheat!
	if ( inputAverage === 0 ) { inputAverage = 0.001 ; }
	if ( weightAverage === 0 ) { weightAverage = 0.001 ; }

	adjustementRate = 0.5 ;

	// Modify synapse
	for ( i = -1 ; i < this.synapses.length ; i ++ ) {
		//if ( this.synapses[ i ].emitter.signal === 0 ) { continue ; }

		// Extract input and weight
		if ( i === -1 ) {
			input = biasInput ;
			weight = biasWeight ;
		}
		else {
			input = this.synapses[ i ].emitter.signal ;
			weight = this.synapses[ i ].weight ;
		}

		iw = input * weight ;
		currentAdjustementRate = adjustementRate * Math.abs( input ) / inputAverage ;

		// Cap that value to 1
		if ( currentAdjustementRate > 1 ) { currentAdjustementRate = 1 ; }

		iwCorrected = iw + iwAverageError * currentAdjustementRate ;

		// Adjust only if iw !== iwCorrected!
		if ( iw !== iwCorrected ) {
			if ( iwCorrected === 0 ) {
				// Cheat
				tmp = iw + iwAverageError ;
				if ( tmp > 0 ) { iwCorrected = 0.001 ; }
				else if ( tmp < 0 ) { iwCorrected = -0.001 ; }
				else if ( iw > 0 ) { iwCorrected = 0.001 ; }
				else if ( iw < 0 ) { iwCorrected = -0.001 ; }
				// else // iw can't be === 0 if we are here
			}

			if ( iw ) {
				if ( iw * iwCorrected > 0 ) {	// if iw & iwCorrected have the same sign
					// Standard case
					// Correction get equally to weight and input (backward)
					tmp = Math.sqrt( iwCorrected / iw ) ;
					input *= tmp ;
					weight *= tmp ;
				}
				else {
					// Ok, the sign is about to switch, let the weight handles the switch
					tmp = Math.sqrt( -iwCorrected / iw ) ;
					input *= tmp ;
					weight *= -tmp ;
				}
			}
			else {
				// Input cannot be equals to 0, or iw === iwCorrected, and we have already looped...

				// So if are here, the weight is equals to 0.
				// Does we correct only the weight here?
				// It seems it doesn't make sens to correct the input, since the weight was nullifying it, whatever its value...
				weight = iwCorrected / input ;
			}
		}


		// Apply the changes
		if ( i === -1 ) {
			this.threshold = -( input * weight ) ;
		}
		else {
			this.synapses[ i ].weight = weight ;
			this.synapses[ i ].emitter.backSignals.push( {
				signal: input ,
				weight: weight
			} ) ;
		}

	}
} ;

*/


