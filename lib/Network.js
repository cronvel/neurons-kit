/*
	Neurons Kit

	Copyright (c) 2015 - 2019 Cédric Ronvel

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
const Neuron = require( './Neuron.js' ) ;
const activationFunctions = require( './activationFunctions.js' ) ;

const shuffleArray = require( 'array-kit/lib/shuffle.js' ) ;



function Network( /* options */ ) {
	this.ready = false ;
	this.outputObject = false ;	// true if we should output named output instead of an array
	this.backSignalNorm = 0 ;
	this.namedInputUnits = {} ;
	this.namedOutputUnits = {} ;
	this.inputUnits = [] ;	// input neurons/signal
	this.outputUnits = [] ;	// output neurons
	this.hiddenUnits = [] ;	// hidden neurons
	this.orderedUnits = [] ;	// ordered hiddenUnits + outputUnits

	this.errorVector = [] ;
	this.errorCost = 0 ;
	this.errorDeltaSum = 0 ;
}

module.exports = Network ;



Network.prototype.addInput = function( input , id = null ) {
	if ( ! ( input instanceof SignalEmitter ) ) {
		id = input ;
		input = new SignalEmitter( { id: id } ) ;
	}
	else if ( id ) {
		input.id = id ;
	}
	else {
		id = input.id ;
	}

	this.inputUnits.push( input ) ;

	if ( id ) {
		this.namedInputUnits[ id ] = input ;
	}

	this.ready = false ;

	return input ;
} ;



Network.prototype.addOutput = function( output , id = null ) {
	if ( ! ( output instanceof SignalEmitter ) ) {
		id = output ;
		output = new Neuron( { id: id } ) ;
	}
	else if ( id ) {
		output.id = id ;
	}
	else {
		id = output.id ;
	}

	this.outputUnits.push( output ) ;

	if ( id ) {
		this.namedOutputUnits[ id ] = output ;
	}

	this.ready = false ;

	return output ;
} ;



Network.prototype.addHidden = function( unit , id = null ) {
	if ( ! ( unit instanceof SignalEmitter ) ) {
		id = unit ;
		unit = new Neuron( { id: id } ) ;
	}
	else if ( id ) {
		unit.id = id ;
	}
	else {
		id = unit.id ;
	}

	this.hiddenUnits.push( unit ) ;
	this.ready = false ;

	return unit ;
} ;



Network.prototype.setNetworkModel = function( model ) {
	var count , activation , neuron , lastLayer ;

	// Set inputs
	if ( Array.isArray( model.inputs ) ) {
		model.inputs.forEach( inputModel => {
			if ( typeof inputModel === 'string' ) { this.addInput( inputModel ) ; }
			else { this.addInput( inputModel.id ) ; }
		} ) ;
	}
	else if ( typeof model.inputs === 'number' ) {
		count = model.inputs ;
		while ( count -- ) { this.addInput() ; }
	}
	else {
		throw new Error( "Missing inputs" ) ;
	}


	activation = model.outputActivation ;
	if ( typeof activation === 'string' ) { activation = activationFunctions.BY_NAME[ activation ] ; }
	if ( typeof activation !== 'function' ) { activation = activationFunctions.sigmoid ; }

	// Set outputs
	if ( Array.isArray( model.outputs ) ) {
		model.outputs.forEach( outputModel => {
			neuron = new Neuron( {
				activation: activation ,
				id: typeof outputModel === 'string' ? outputModel : outputModel.id
			} ) ;

			this.addOutput( neuron , outputModel.id ) ;
		} ) ;
	}
	else if ( typeof model.outputs === 'number' ) {
		count = model.outputs ;
		while ( count -- ) { this.addOutput( new Neuron( { activation: activation } ) ) ; }
	}
	else {
		throw new Error( "Missing outputs" ) ;
	}

	this.outputObject = !! model.outputObject ;

	lastLayer = this.inputUnits ;

	// Add hidden layers
	if ( model.layers ) {
		model.layers.forEach( layerModel => {
			var layer = [] ;

			if ( typeof layerModel === 'number' ) {
				count = layerModel ;
				activation = 'linear' ;
			}
			else if ( layerModel && typeof layerModel === 'object' ) {
				count = layerModel.units || 1 ;
				activation = layerModel.activation || 'linear' ;
			}
			else {
				throw new Error( "Bad model" ) ;
			}

			while ( count -- ) {
				layer.push( this.addHidden( new Neuron( { activation: activation } ) ) ) ;
			}

			this.connectLayerDense( layer , lastLayer ) ;
			lastLayer = layer ;
		} ) ;
	}

	// Now to the output
	this.connectLayerDense( this.outputUnits , lastLayer ) ;
	
	this.computeUnitOrder() ;
	this.randomize() ;
} ;



Network.prototype.connectLayerDense = function( layer , inputLayer ) {
	layer.forEach( unit => {
		inputLayer.forEach( inputUnit => {
			unit.addInput( inputUnit ) ;
		} ) ;
	} ) ;
} ;



Network.prototype.setInputs = function( inputs ) {
	var i , iMax = Math.min( inputs.length , this.inputUnits.length ) ;

	for ( i = 0 ; i < iMax ; i ++ ) {
		this.inputUnits[ i ].signal = inputs[ i ] ;
	}
} ;



Network.prototype.setNamedInputs = function( namedInputs ) {
	var name ;

	for ( name in namedInputs ) {
		if ( this.namedInputUnits[ name ] ) {
			this.namedInputUnits[ name ].signal = namedInputs[ name ] ;
		}
	}
} ;



Network.prototype.getOutputs = function() {
	return this.outputUnits.map( output => output.signal ) ;
} ;



Network.prototype.getNamedOuputs = function() {
	var name , output = {} ;

	for ( name in this.namedOutputUnits ) {
		output[ name ] = this.namedOutputUnits[ name ].signal ;
	}

	return output ;
} ;



Network.prototype.toOutputArray = function( object ) {
	return this.outputUnits.map( unit => unit.id ? object[ unit.id ] || 0 : 0 ) ;
} ;



Network.prototype.init =
Network.prototype.computeUnitOrder = function() {
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



var random = ( min , max ) => min + Math.random() * ( max - min ) ;

Network.prototype.randomize = function( min = -1 , max = 1 ) {
	this.orderedUnits.forEach( unit => {
		unit.bias = random( min , max ) ;
		unit.synapses.forEach( synapse => synapse.weight = random( min , max ) ) ;
	} ) ;
} ;



Network.prototype.forwardSignal = function() {
	this.orderedUnits.forEach( unit => unit.forwardSignal() ) ;
} ;



Network.prototype.process =
Network.prototype.forwardCycle = function( inputs , namedOutput = this.outputObject ) {
	if ( ! this.ready ) { this.init() ; }

	if ( Array.isArray( inputs ) ) { this.setInputs( inputs ) ; }
	else { this.setNamedInputs( inputs ) ; }

	this.forwardSignal() ;

	var outputs = namedOutput ? this.getNamedOutputs() : this.getOutputs() ;
	console.log( "input: %s , output: %s" , inputs , outputs ) ;

	return outputs ;
} ;



Network.prototype.stackError = function( expectedVector , errorVector ) {
	if ( expectedVector.length !== this.outputUnits.length ) {
		throw new Error( 'computeError(): expected output length mismatch' ) ;
	}

	expectedVector.forEach( ( expected , index ) => errorVector.push( this.outputUnits[ index ].signal - expected ) ) ;
	console.log( "expected: %s" , expectedVector ) ;
} ;



Network.prototype.setErrorDelta = function( errorDelta , offset = 0 ) {
	var i , iMax = this.outputUnits.length ;

	offset *= iMax ;

	// Reset all errorDelta
	this.errorDeltaSum = 0 ;
	this.orderedUnits.forEach( unit => {
		unit.errorDelta = 0 ;
		unit.biasErrorDelta = 0 ;
		unit.synapses.forEach( synapse => synapse.errorDelta = 0 ) ;
	} ) ;

	// Set output errorDelta
	for ( i = 0 ; i < iMax ; i ++ ) {
		this.outputUnits[ i ].errorDelta = errorDelta[ i + offset ] ;
	}
} ;



Network.prototype.costFunction = function( errorVector , errorDelta ) {
	console.log( errorVector ) ;
	this.errorCost = Math.hypot( ... errorVector ) ;

	if ( this.errorCost ) {
		errorVector.forEach( ( error , index ) => errorDelta[ index ] = error / this.errorCost ) ;
	}
	else {
		errorVector.forEach( ( error , index ) => errorDelta[ index ] = 0 ) ;
	}

	console.log( "errorCost: %s" , this.errorCost.toFixed( 5 ) ) ;
	return this.errorCost ;
} ;



Network.prototype.backwardErrorDelta = function( slippyDerivative = false ) {
	var i = this.orderedUnits.length ;

	while ( i -- ) {
		this.errorDeltaSum += this.orderedUnits[ i ].backwardErrorDelta( slippyDerivative ) ;
	}
} ;



Network.prototype.adapt = function( learningRate = 0.5 , momentumRate = 0 ) {
	var correctionNorm = 0 , inputNorm = 0 , correctionRate = 0 ;

	// Some use 1 - momentum, some stack the momentum without changing the base value
	// IMHO it's best to stack, so it can accelerate more and more
	//var baseRate = 1 - momentumRate ;
	var baseRate = 1 ;

	if ( ! this.ready ) { this.init() ; }

	var rate = learningRate ;
	//var rate = learningRate * this.errorCost ;

	// Now apply the correction...
	this.orderedUnits.forEach( unit => {
		// For the bias
		unit.biasAdaptMomentum = -baseRate * unit.biasErrorDelta * rate + momentumRate * unit.biasAdaptMomentum ;
		unit.bias += unit.biasAdaptMomentum ;
		unit.errorDelta = 0 ;

		// For each synapse
		unit.synapses.forEach( synapse => {
			synapse.adaptMomentum = -baseRate * synapse.errorDelta * rate + momentumRate * synapse.adaptMomentum ;
			synapse.weight += synapse.adaptMomentum ;
			synapse.errorDelta = 0 ;
		} ) ;

		//*
		var str = '' ;
		unit.synapses.forEach( ( s , i ) => str += ' W' + i + ': ' + s.weight.toFixed( 5 ) + ' (Δ' + s.adaptMomentum.toFixed( 5 ) + ')' ) ;
		console.log( "CR Neuron --%s bias: %s (Δ%s)" , str , unit.bias.toFixed( 5 ) , unit.biasAdaptMomentum.toFixed( 5 ) ) ;
		//*/
	} ) ;
} ;



/*
	Stochastic training: adapt after each sample, not after a whole batch/epoch.
	So the gradient descent is not uniform, and it may avoid few traps.

	It has some adaptative behaviors.

	Missing features:
		- splitting the samples into training and validation, to avoid overfitting
*/
Network.prototype.train =
Network.prototype.trainStochastic = function( samples_ , options = {} ) {
	if ( ! samples_.length ) { return ; }

	var errorDeltaSum , errorDeltaSquaredSum , errorDeltaAvg , errorDeltaNorm ,
		errorSum , lastErrorAvg , errorAvg , errorSquaredSum , errorNorm ,
		stallBoostFactor ,
		expectedVector = [] , errorVector = [] , errorDelta = [] ,
		maxError = options.maxError || 0.01 ,
		remainingEpochs = options.epochs || 1000 ,
		learningRate = options.learningRate || 0.2 ,
		adaptRate = learningRate * 0.2 ,
		lastAdaptRate = adaptRate ,
		lastWantedAdaptRate = adaptRate ,
		wantedAdaptRate = adaptRate ,
		newAdaptRate ,
		momentumRate = options.momentumRate || 0 ,
		shuffle = !! options.shuffle ,
		slippyDerivative = !! ( options.slippyDerivative || options.slippy ) ,
		samples = samples_.map( sample => Array.isArray( sample[ 1 ] ) ? sample : [ sample[ 0 ] , this.toOutputArray( sample[ 1 ] ) ] ) ;


	while ( remainingEpochs -- ) {
		if ( shuffle ) { shuffleArray( samples ) ; }

		errorDeltaSum = 0 ;
		errorDeltaSquaredSum = 0 ;
		errorSum = 0 ;
		errorSquaredSum = 0 ;

		samples.forEach( sample => {
			console.log( "---" ) ;
			var [ input , expected ] = sample ;

			// Reset
			expectedVector.length = 0 ;
			errorVector.length = 0 ;
			errorDelta.length = 0 ;
			// ---

			this.forwardCycle( input , false ) ;
			this.stackError( expected , errorVector ) ;
			this.costFunction( errorVector , errorDelta ) ;

			if ( this.errorCost < maxError ) { return ; }

			this.setErrorDelta( errorDelta ) ;
			this.backwardErrorDelta( slippyDerivative ) ;

			errorDeltaSum += this.errorDeltaSum ;
			errorDeltaSquaredSum += this.errorDeltaSum * this.errorDeltaSum ;
			errorSum += this.errorCost ;
			errorSquaredSum += this.errorCost * this.errorCost ;
			this.adapt( adaptRate , momentumRate ) ;
		} ) ;


		errorDeltaAvg = errorDeltaSum / samples.length ;
		errorDeltaNorm = Math.sqrt( errorDeltaSquaredSum ) ;
		lastErrorAvg = errorAvg ;
		errorAvg = errorSum / samples.length ;
		errorNorm = Math.sqrt( errorSquaredSum ) ;

		// /!\ or use errorNorm? or some mean average?
		if ( errorAvg <= maxError ) { break ; }

		// Modify the adapt rate
		// This part is really experimental, it's not easy to figure out how to move the adapt rate
		if ( lastErrorAvg && errorDeltaNorm ) {
			lastWantedAdaptRate = wantedAdaptRate ;
			wantedAdaptRate = learningRate * Math.min( errorAvg , lastErrorAvg ) / errorDeltaNorm ;

			if ( errorAvg < lastErrorAvg * 1.01 ) {
				stallBoostFactor = Math.min( lastErrorAvg / ( 2 * ( lastErrorAvg * 1.01 - errorAvg ) ) , errorDeltaNorm ) ;
				if ( stallBoostFactor > 1 ) {
					console.log( "\n\t>>> stallBoostFactor:" , stallBoostFactor.toFixed( 5 ) ) ;
					wantedAdaptRate *= stallBoostFactor ;
				}
			}

			adaptRate = Math.min( wantedAdaptRate , lastWantedAdaptRate ) ;
		}

		console.log( '\n\n>>> Epoch average error:' , errorAvg.toFixed( 5 ) , "error norm:" , errorNorm.toFixed( 5 ) , "average delta:" , errorDeltaAvg.toFixed( 5 ) , "delta norm:" , errorDeltaNorm.toFixed( 5 ) , "next adaptRate:" , adaptRate.toFixed( 5 ) , "(" + remainingEpochs + ")\n\n" ) ;
	}

	console.log( '\nLast epoch average error:' , errorAvg.toFixed( 5 ) , "error norm:" , errorNorm.toFixed( 5 ) , "average delta:" , errorDeltaAvg.toFixed( 5 ) , "delta norm:" , errorDeltaNorm.toFixed( 5 ) , "(" + remainingEpochs + ")\n\n" ) ;

	return errorAvg ;
} ;



// /!\ There is something wrong with this algorithm, it doesn't converge...
Network.prototype.trainBatch = function( samples , options = {} ) {
	if ( ! samples.length ) { return ; }

	var errorSum , errorAvg , errorSquaredSum , errorNorm ,
		expectedVector = [] , errorVector = [] , errorDelta = [] ,
		maxError = options.maxError || 0.01 ,
		remainingEpochs = options.epochs || 1000 ,
		learningRate = options.learningRate || 0.5 ,
		adaptRate = learningRate * 0.1 ,
		momentumRate = options.momentumRate || 0 ,
		slippyDerivative = !! ( options.slippyDerivative || options.slippy ) ;


	while ( remainingEpochs -- ) {
		errorSum = 0 ;
		errorSquaredSum = 0 ;

		// Reset
		expectedVector.length = 0 ;
		errorVector.length = 0 ;
		errorDelta.length = 0 ;
		// ---

		samples.forEach( sample => {
			console.log( "---" ) ;
			var [ input , expected ] = sample ;

			this.forwardCycle( input , false ) ;
			this.stackError( expected , errorVector ) ;
		} ) ;

		this.costFunction( errorVector , errorDelta ) ;

		if ( this.errorCost < maxError ) { break ; }

		adaptRate = learningRate * this.errorCost ;
		console.log( '\n>>> Adapt phase -- errorCost:' , this.errorCost.toFixed( 5 ) , "adaptRate:" , adaptRate.toFixed( 5 ) , "(" + remainingEpochs + ")\n" ) ;

		samples.forEach( ( sample , index ) => {
			var input = sample[ 0 ] ;

			// We need to forward the input again... not very optimized...
			this.forwardCycle( input , false ) ;

			this.setErrorDelta( errorDelta , index ) ;
			this.backwardErrorDelta( slippyDerivative ) ;
		} ) ;

		this.adapt( adaptRate , momentumRate ) ;

		console.log( '\n>>> End of epoch' ) ;
	}

	console.log( '\nLast epoch average error:' , this.errorCost.toFixed( 5 ) , "(" + remainingEpochs + ")" ) ;

	return this.errorCost ;
} ;

