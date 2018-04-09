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



// Create the object & export it
var nk = {} ;
module.exports = nk ;





/* Generic SignalEmitter */



nk.SignalEmitter = function SignalEmitter() {} ;

nk.createSignalEmitter = function createSignalEmitter( options , emitter ) {
	if ( ! ( emitter instanceof nk.SignalEmitter ) ) { emitter = Object.create( nk.SignalEmitter.prototype ) ; }

	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	emitter.network = null ;
	emitter.stateId = 0 ;
	emitter.signal = options.signal !== undefined ? options.signal : 0 ;
	emitter.backSignals = [] ;

	return emitter ;
} ;



nk.SignalEmitter.prototype.connectTo = function connectTo( neuron , weight ) {
	if ( ! ( neuron instanceof nk.Neuron ) ) { throw new TypeError( '[SignalEmitter] .connectTo(): arguments #0 should be an instance of Neuron' ) ; }

	neuron.synapses.push( nk.createSynapse( this , weight ) ) ;

	if ( neuron.network ) {
		neuron.network.stateId ++ ;
		neuron.network.ready = false ;
	}
} ;





/* Neuron */



nk.Neuron = function Neuron() {} ;
nk.Neuron.prototype = Object.create( nk.SignalEmitter.prototype ) ;
nk.Neuron.prototype.constructor = nk.Neuron ;



nk.createNeuron = function createNeuron( options , neuron ) {
	if ( ! ( neuron instanceof nk.Neuron ) ) { neuron = Object.create( nk.Neuron.prototype ) ; }

	if ( ! options || typeof options !== 'object' ) { options = {} ; }

	nk.createSignalEmitter( options , neuron ) ;

	neuron.transfer = typeof options.transfer === 'string' && nk.transferFunctions[ options.transfer ] ?
		nk.transferFunctions[ options.transfer ] :
		nk.transferFunctions.step ;

	// This is the activation threshold
	neuron.threshold = options.threshold !== undefined ? options.threshold : 0.5 ;

	// This control if the activation threshold is smooth (low rate) or hard (high rate).
	// Practicaly, it just multiply the ( synaptic_sums - threshold ) before passing it to the transfer function.
	neuron.scale = options.scale !== undefined ? options.scale : 1 ;

	neuron.synapses = [] ;

	return neuron ;
} ;



// Create the output signal from the input signals
nk.Neuron.prototype.forwardSignal = function forwardSignal( networkRecursive ) {
	var i , sum = 0 ;

	networkRecursive = this.network && !! networkRecursive ;

	this.backSignals = [] ;

	sum -= this.threshold ;

	//# debugForwardSignal : console.error( "\n--- .forwardSignal() #%s ---" , debugForwardSignalCount ++ ) ;
	//# debugForwardSignal : console.error( "Synapse sum (after bias, iw: %s): %s" , - this.threshold , sum ) ;

	for ( i = 0 ; i < this.synapses.length ; i ++ ) {
		if (
			networkRecursive &&
			this.synapses[ i ].emitter.stateId < this.network.stateId &&
			this.synapses[ i ].emitter instanceof nk.Neuron ) {
			//console.error( "###" , this.synapses[ i ].emitter.stateId , this.synapses[ i ].emitter.network.stateId , this.network.stateId )
			this.synapses[ i ].emitter.forwardSignal( true ) ;
		}

		sum += this.synapses[ i ].emitter.signal * this.synapses[ i ].weight ;

		/*# debugForwardSignal :
		console.error( "Synapse sum (after synapse #%s i: %s , w: %s , iw: %s): %s" , i ,
			this.synapses[ i ].emitter.signal , this.synapses[ i ].weight , this.synapses[ i ].emitter.signal * this.synapses[ i ].weight , sum ) ;
		//*/
	}

	sum *= this.scale ;

	this.signal = this.transfer( sum ) ;

	//# debugForwardSignal : console.error( "Emitted signal: %s" , this.signal ) ;

	if ( networkRecursive ) { this.stateId = this.network.stateId ; }
} ;

//# debugForwardSignal : var debugForwardSignalCount = 0 ;



// /!\ Back signals should be reset network-wide before calling this

// Create the backward input back-signal from the output back-signal
nk.Neuron.prototype.backwardSignal = function backwardSignal() {
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

		/*# debugBackwardSignal :
		if ( i === -1 )
		{
			console.error(
				"Bias --- i: %s , w: %s , iw: %d ; iwCor.: %d ; iwAvgErr: %d ; rate: %d" ,
				input , weight , iw , iwCorrected , iwAverageError , currentAdjustementRate ) ;
		}
		else
		{
			console.error(
				"Synapse #%d --- i: %s , w: %s , iw: %d ; iwCor.: %d ; iwAvgErr: %d ; rate: %d" ,
				i , input , weight , iw , iwCorrected , iwAverageError , currentAdjustementRate ) ;
		}
		//*/

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

//# debugBackwardSignal : var debugBackwardSignalCount = 0 ;





/* Synpase */



nk.Synapse = function Synapse() {} ;

nk.createSynapse = function createSynapse( emitter , weight ) {
	var synapse = Object.create( nk.Synapse.prototype ) ;

	if ( ! ( emitter instanceof nk.SignalEmitter ) ) { throw new TypeError( '[synapse] .createSynpase(): arguments #0 should be an instance of SignalEmitter' ) ; }

	synapse.emitter = emitter ;
	synapse.weight = weight !== undefined ? weight : 1 ;

	return synapse ;
} ;





/* Network */



nk.Network = function Network() {} ;

nk.createNetwork = function createNetwork( options ) {
	var network = Object.create( nk.Network.prototype ) ;

	//if ( ! options || typeof options !== 'object' ) { throw new TypeError( '[network] .createNetwork(): arguments #0 should be an object of options' ) ; }
	//if ( ! Array.isArray( options.inputs ) ) { throw new TypeError( "[network] .createNetwork(): arguments #0 should have an 'inputs' property containing an array of string" ) ; }
	//if ( ! Array.isArray( options.outputs ) ) { throw new TypeError( "[network] .createNetwork(): arguments #0 should have an 'outputs' property containing an array of string" ) ; }

	network.stateId = 0 ;
	network.ready = false ;
	network.inputs = {} ;
	network.outputs = {} ;
	network.hiddenNeurons = [] ;
	network.neuronOrder = [] ;

	//var i ;
	//for ( i = 0 ; i < options.inputs.length ; i ++ ) { network.inputs[ options.inputs[ i ] ] = null ; }
	//for ( i = 0 ; i < options.outputs.length ; i ++ ) { network.outputs[ options.outputs[ i ] ] = null ; }

	return network ;
} ;



nk.Network.prototype.addInput = function addInput( name , emitter ) {
	if ( ! name || typeof name !== 'string' ) { throw new TypeError( '[network] .addInput(): arguments #0 should be non-empty string' ) ; }
	if ( ! ( emitter instanceof nk.SignalEmitter ) ) { throw new TypeError( '[network] .addInput(): arguments #1 should be an instance of SignalEmitter' ) ; }
	if ( this.inputs[ name ] ) { throw new TypeError( "[network] .addInput(): the current input '" + name + "' is already defined" ) ; }
	if ( emitter.network ) { throw new Error( '[network] .addInput(): the emitter is already part of a network' ) ; }

	this.inputs[ name ] = emitter ;
	emitter.network = this ;
	this.stateId ++ ;
	this.ready = false ;
} ;



nk.Network.prototype.addOutput = function addOutput( name , neuron ) {
	if ( ! name || typeof name !== 'string' ) { throw new TypeError( '[network] .addOutput(): arguments #0 should be non-empty string' ) ; }
	if ( ! ( neuron instanceof nk.Neuron ) ) { throw new TypeError( '[network] .addOutput(): arguments #1 should be an instance of Neuron' ) ; }
	if ( this.outputs[ name ] ) { throw new TypeError( "[network] .addOutput(): the current output '" + name + "' is already defined" ) ; }
	if ( neuron.network ) { throw new Error( '[network] .addOutput(): the neuron is already part of a network' ) ; }

	this.outputs[ name ] = neuron ;
	neuron.network = this ;
	this.stateId ++ ;
	this.ready = false ;
} ;



nk.Network.prototype.addHiddenNeuron = function addHiddenNeuron( neuron ) {
	if ( ! ( neuron instanceof nk.Neuron ) ) { throw new TypeError( '[network] .addHiddenNeuron(): arguments #0 should be an instance of Neuron' ) ; }
	if ( neuron.network ) { throw new Error( '[network] .addHiddenNeuron(): the neuron is already part of a network' ) ; }

	this.hiddenNeurons.push( neuron ) ;
	neuron.network = this ;
	this.stateId ++ ;
	this.ready = false ;
} ;



nk.Network.prototype.setInputSignals = function setInputSignals( inputs ) {
	if ( ! inputs || typeof inputs !== 'object' ) { throw new TypeError( '[network] .setInputSignals(): arguments #0 should be an object' ) ; }

	var key , modified = false ;

	for ( key in inputs ) {
		if ( key in this.inputs && this.inputs[ key ].signal !== inputs[ key ] ) {
			this.inputs[ key ].signal = inputs[ key ] ;

			if ( ! modified ) {
				modified = true ;
				this.stateId ++ ;
			}

			this.inputs[ key ].stateId = this.stateId ;
		}
	}
} ;



nk.Network.prototype.getOutputSignal = function getOutputSignal( name ) {
	// undefined or throw error?
	if ( ! ( name in this.outputs ) ) { return undefined ; }

	if ( this.outputs[ name ].stateId >= this.stateId ) { return this.outputs[ name ].signal ; }

	this.outputs[ name ].forwardSignal( true ) ;

	return this.outputs[ name ].signal ;
} ;



nk.Network.prototype.setOutputBackSignals = function setOutputBackSignals( outputs ) {
	if ( ! outputs || typeof outputs !== 'object' ) { throw new TypeError( '[network] .setOutputBackSignals(): arguments #0 should be an object' ) ; }

	var key ;

	for ( key in outputs ) {
		if ( key in this.outputs ) {
			this.outputs[ key ].backSignals = [ { signal: outputs[ key ] , weight: 1 } ] ;
		}
	}
} ;



nk.Network.prototype.feedForwardOrder = function feedForwardOrder() {
	var self = this , i , j , inputs , currents , nexts , neuron ;

	this.neuronOrder = [] ;

	inputs = Object.keys( this.inputs ).map( ( key ) => { return self.inputs[ key ] ; } ) ;

	currents = Object.keys( this.outputs ).map( ( key ) => { return self.outputs[ key ] ; } ) ;
	this.neuronOrder = currents.slice() ;

	// This is a Breadth-First Search algorithm

	while ( currents.length ) {
		nexts = [] ;

		for ( i = 0 ; i < currents.length ; i ++ ) {
			// Stop at network boundaries: do not orders neurons that are before inputs
			if ( inputs.indexOf( currents[ i ] ) >= 0 ) { continue ; }

			for ( j = 0 ; j < currents[ i ].synapses.length ; j ++ ) {
				neuron = currents[ i ].synapses[ j ].emitter ;

				if ( ! ( neuron instanceof nk.Neuron ) ) { continue ; }
				if ( neuron.network !== this ) { continue ; }

				if ( nexts.indexOf( neuron ) >= 0 ) { continue ; }
				else if ( this.neuronOrder.indexOf( neuron ) >= 0 ) { throw new Error( '[Network] .feedForwardOrder(): Circular network' ) ; }

				nexts.unshift( neuron ) ;
				this.neuronOrder.unshift( neuron ) ;
			}
		}

		currents = nexts ;
	}

	this.ready = true ;
} ;



nk.Network.prototype.feedForward = function feedForward( inputs ) {
	var i , key , outputs = {} ;

	if ( ! this.ready ) { this.feedForwardOrder() ; }

	this.setInputSignals( inputs ) ;

	for ( i = 0 ; i < this.neuronOrder.length ; i ++ ) {
		this.neuronOrder[ i ].forwardSignal() ;
	}

	for ( key in this.outputs ) { outputs[ key ] = this.outputs[ key ].signal ; }

	return outputs ;
} ;



nk.Network.prototype.backwardCorrection = function backwardCorrection( outputs ) {
	var i ;

	if ( ! this.ready ) { this.feedForwardOrder() ; }

	for ( i = 0 ; i < this.neuronOrder.length ; i ++ ) {
		this.neuronOrder[ i ].backSignals = [] ;
	}

	this.setOutputBackSignals( outputs ) ;

	for ( i = this.neuronOrder.length - 1 ; i >= 0 ; i -- ) {
		this.neuronOrder[ i ].backwardSignal() ;
	}
} ;





/* Transfer functions */



nk.transferFunctions = {} ;



nk.transferFunctions.step = function( x ) { return x >= 0 ? 1 : 0 ; } ;
// The step function has no inverse... But we will fake that somewhat
nk.transferFunctions.step.inverse = function( x ) { return x > 0.5 ? 0.5 : -0.5 ; } ;

nk.transferFunctions.linear = function( x ) { return x ; } ;
nk.transferFunctions.linear.inverse = nk.transferFunctions.linear ;

nk.transferFunctions.rectifier = function( x ) { return Math.max( 0 , x ) ; } ;
// The rectifier function has no inverse... But we will fake that somewhat
nk.transferFunctions.rectifier.inverse = function( x ) { return x > 0 ? x : -0.5 ; } ;

nk.transferFunctions.leakyRectifier = function( x ) { return x >= 0 ? x : 0.01 * x ; } ;
nk.transferFunctions.leakyRectifier.inverse = function( x ) { return x >= 0 ? x : 100 * x ; } ;

nk.transferFunctions.softPlus = function( x ) { return Math.log( 1 + Math.exp( x ) ) ; } ;
nk.transferFunctions.softPlus.inverse = function( x ) { return Math.log( Math.exp( x ) - 1 ) ; } ;

// Sigmoid logistic
nk.transferFunctions.logistic = function( x ) { return 1 / ( 1 + Math.exp( -x ) ) ; } ;
// The inverse is actually the 'logit' function
nk.transferFunctions.logistic.inverse = function( x ) { return Math.log( x / ( 1 - x ) ) ; } ;



// Training:
// http://en.wikipedia.org/wiki/Perceptron#Example
// http://en.wikipedia.org/wiki/Backpropagation

