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
const Neuron = require( './Neuron.js' ) ;
const activationFunctions = require( './activationFunctions.js' ) ;

const shuffleArray = require( 'array-kit/lib/shuffle.js' ) ;

const Logfella = require( 'logfella' ) ;
const log = Logfella.global.use( 'neurons-kit' ) ;



function Network( /* options */ ) {
	this.ready = false ;

	this.inputUnits = [] ;	// input neurons/signal
	this.outputUnits = [] ;	// output neurons
	this.hiddenUnits = [] ;	// hidden neurons
	this.orderedUnits = [] ;	// ordered hiddenUnits + outputUnits

	this.backSignalNorm = 0 ;
	this.errorVector = [] ;
	this.errorCost = 0 ;
	this.errorDeltaSum = 0 ;

	this.outputObject = false ;	// true if we should output named output instead of an array
	this.namedInputIndexes = {} ;
	this.namedOutputIndexes = {} ;
}

module.exports = Network ;



Network.prototype.addInput = function( input , id = null ) {
	if ( ! ( input instanceof SignalEmitter ) ) {
		id = input ;
		input = new SignalEmitter( { id: 'i:' + id } ) ;
	}
	else if ( id !== null ) {
		input.id = 'i:' + id ;
	}

	this.inputUnits.push( input ) ;

	if ( id ) {
		this.namedInputIndexes[ id ] = this.inputUnits.length - 1 ;
	}

	this.ready = false ;

	return input ;
} ;



Network.prototype.addOutput = function( output , id = null ) {
	if ( ! ( output instanceof SignalEmitter ) ) {
		id = output ;
		output = new Neuron( { id: 'o:' + id } ) ;
	}
	else if ( id !== null ) {
		output.id = 'o:' + id ;
	}

	this.outputUnits.push( output ) ;

	if ( id ) {
		this.namedOutputIndexes[ id ] = this.outputUnits.length - 1 ;
	}

	this.ready = false ;

	return output ;
} ;



Network.prototype.addHidden = function( unit , id = null , layer = null ) {
	if ( ! ( unit instanceof SignalEmitter ) ) {
		id = unit ;
		unit = new Neuron( { id: 'h:' + ( layer === null ? id : layer + ':' + id ) } ) ;
	}
	else if ( id !== null ) {
		unit.id = 'h:' + ( layer === null ? id : layer + ':' + id ) ;
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
			this.addOutput( new Neuron( { activation: activation } ) , typeof outputModel === 'string' ? outputModel : outputModel.id ) ;
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
		model.layers.forEach( ( layerModel , layerIndex ) => {
			var index , layer = [] ;

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

			for ( index = 0 ; index < count ; index ++ ) {
				layer.push( this.addHidden( new Neuron( { activation: activation } ) , index , layerIndex ) ) ;
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



Network.prototype.serialize = function( pretty ) {
	// We need to compute units order first
	if ( ! this.ready ) { this.init() ; }

	var data = {
		inputs: this.inputUnits.map( u => u.id ) ,
		units: this.orderedUnits.map( u => ( {
			id: u.id ,
			a: u.activation.id ,
			b: u.bias ,
			s: u.synapses.map( s => ( {
				i: s.input.id ,
				w: s.weight
			} ) )
		} ) )
	} ;

	if ( this.outputObject ) {
		data.outputObject = true ;
	}

	return JSON.stringify( data , null , pretty ? '    ' : null ) ;
} ;



// !! Share some code with .unserialize() !!
Network.prototype.clone = function() {
	var unitMap = {} ,
		network = new Network() ;

	this.inputUnits.forEach( unit_ => {
		var id = unit_.id ;
		var indexOf = id.indexOf( ':' ) ;
		var name = id.slice( indexOf + 1 ) ;
		var unit = network.addInput( name ) ;
		unitMap[ id ] = unit ;
	} ) ;

	this.orderedUnits.forEach( unit_ => {
		var indexOf = unit_.id.indexOf( ':' ) ;
		var prefix = unit_.id.slice( 0 , indexOf ) ;
		var name = unit_.id.slice( indexOf + 1 ) ;

		var unit = new Neuron( { activation: unit_.activation , bias: unit_.bias } ) ;
		unitMap[ unit_.id ] = unit ;

		if ( prefix === 'o' ) {
			network.addOutput( unit , name ) ;
		}
		else {
			network.addHidden( unit , name ) ;
		}

		unit_.synapses.forEach( synapse_ => {
			if ( ! unitMap[ synapse_.input.id ] ) {
				throw new Error( "Can't unserialize, unknown unit id " + synapse_.input.id ) ;
			}

			unit.addInput( unitMap[ synapse_.input.id ] , synapse_.weight ) ;
		} ) ;
	} ) ;

	network.computeUnitOrder() ;

	if ( this.outputObject ) {
		network.outputObject = true ;
	}

	return network ;
} ;



// !! Share some code with .clone() !!
Network.unserialize = function( data ) {
	data = JSON.parse( data ) ;

	var unitMap = {} ,
		network = new Network() ;

	data.inputs.forEach( id => {
		var indexOf = id.indexOf( ':' ) ;
		var name = id.slice( indexOf + 1 ) ;
		var unit = network.addInput( name ) ;
		unitMap[ id ] = unit ;
	} ) ;

	data.units.forEach( unitData => {
		var indexOf = unitData.id.indexOf( ':' ) ;
		var prefix = unitData.id.slice( 0 , indexOf ) ;
		var name = unitData.id.slice( indexOf + 1 ) ;

		var unit = new Neuron( { activation: unitData.a , bias: unitData.b } ) ;
		unitMap[ unitData.id ] = unit ;

		if ( prefix === 'o' ) {
			network.addOutput( unit , name ) ;
		}
		else {
			network.addHidden( unit , name ) ;
		}

		unitData.s.forEach( synapseData => {
			if ( ! unitMap[ synapseData.i ] ) {
				throw new Error( "Can't unserialize, unknown unit id " + synapseData.i ) ;
			}

			unit.addInput( unitMap[ synapseData.i ] , synapseData.w ) ;
		} ) ;
	} ) ;

	network.computeUnitOrder() ;

	if ( data.outputObject ) {
		network.outputObject = true ;
	}

	return network ;
} ;



const fs = require( 'fs' ) ;

Network.prototype.save = function( filePath ) {
	return fs.promises.writeFile( filePath , this.serialize() ) ;
} ;

Network.load = async function( filePath ) {
	return Network.unserialize( await fs.promises.readFile( filePath , 'utf8' ) ) ;
} ;

Network.prototype.load = async function( filePath ) {
	Object.assign( this , await Network.load( filePath ) ) ;
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
		if ( name in this.namedInputIndexes ) {
			this.inputUnits[ this.namedInputIndexes[ name ] ].signal = namedInputs[ name ] ;
		}
	}
} ;



Network.prototype.getOutputs = function() {
	return this.outputUnits.map( output => output.signal ) ;
} ;



Network.prototype.getNamedOutputs = function() {
	var name , output = {} ;

	for ( name in this.namedOutputIndexes ) {
		output[ name ] = this.outputUnits[ this.namedOutputIndexes[ name ] ].signal ;
	}

	return output ;
} ;



Network.prototype.toOutputArray = function( namedOutput ) {
	var name ,
		output = new Array( this.outputUnits.length ) ;

	for ( name in this.namedOutputIndexes ) {
		output[ this.namedOutputIndexes[ name ] ] = name in namedOutput ? namedOutput[ name ] : 0 ;
	}

	return output ;
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
	//log.debug( "input: %s , output: %s" , inputs , outputs ) ;

	return outputs ;
} ;



Network.prototype.stackError = function( expectedVector , errorVector ) {
	if ( expectedVector.length !== this.outputUnits.length ) {
		throw new Error( 'computeError(): expected output length mismatch' ) ;
	}

	expectedVector.forEach( ( expected , index ) => errorVector.push( this.outputUnits[ index ].signal - expected ) ) ;
	//log.debug( "expected: %s" , expectedVector ) ;
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
	//log.debug( "errorVector: %Y" , errorVector ) ;
	this.errorCost = Math.hypot( ... errorVector ) ;

	if ( this.errorCost ) {
		errorVector.forEach( ( error , index ) => errorDelta[ index ] = error / this.errorCost ) ;
	}
	else {
		errorVector.forEach( ( error , index ) => errorDelta[ index ] = 0 ) ;
	}

	//log.debug( "errorCost: %s" , this.errorCost.toFixed( 5 ) ) ;
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

		/*
		var str = '' ;
		unit.synapses.forEach( ( s , i ) => str += ' W' + i + ': ' + s.weight.toFixed( 5 ) + ' (Δ' + s.adaptMomentum.toFixed( 5 ) + ')' ) ;
		log.debug( "CR Neuron --%s bias: %s (Δ%s)" , str , unit.bias.toFixed( 5 ) , unit.biasAdaptMomentum.toFixed( 5 ) ) ;
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
			//log.debug( "---" ) ;
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
					log.debug( ">>> stallBoostFactor: %s" , stallBoostFactor.toFixed( 5 ) ) ;
					wantedAdaptRate *= stallBoostFactor ;
				}
			}

			adaptRate = Math.min( wantedAdaptRate , lastWantedAdaptRate ) ;
		}

		log.info( ">>> Epoch average error: %s error norm: %s average delta: %s delta norm: %s next adaptRate: %s (%s)" , errorAvg.toFixed( 5 ) , errorNorm.toFixed( 5 ) , errorDeltaAvg.toFixed( 5 ) , errorDeltaNorm.toFixed( 5 ) , adaptRate.toFixed( 5 ) , remainingEpochs ) ;
	}

	log.info( "Last epoch average error: %s error norm: %s average delta: %s delta norm: %s (%s)" , errorAvg.toFixed( 5 ) , errorNorm.toFixed( 5 ) , errorDeltaAvg.toFixed( 5 ) , errorDeltaNorm.toFixed( 5 ) , remainingEpochs ) ;

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
			log.debug( "---" ) ;
			var [ input , expected ] = sample ;

			this.forwardCycle( input , false ) ;
			this.stackError( expected , errorVector ) ;
		} ) ;

		this.costFunction( errorVector , errorDelta ) ;

		if ( this.errorCost < maxError ) { break ; }

		adaptRate = learningRate * this.errorCost ;
		log.debug( ">>> Adapt phase -- errorCost: %s adaptRate: %s (%s)" , this.errorCost.toFixed( 5 ) , adaptRate.toFixed( 5 ) , remainingEpochs ) ;

		samples.forEach( ( sample , index ) => {
			var input = sample[ 0 ] ;

			// We need to forward the input again... not very optimized...
			this.forwardCycle( input , false ) ;

			this.setErrorDelta( errorDelta , index ) ;
			this.backwardErrorDelta( slippyDerivative ) ;
		} ) ;

		this.adapt( adaptRate , momentumRate ) ;

		log.debug( '>>> End of epoch' ) ;
	}

	log.debug( 'Last epoch average error: %s (%s)' , this.errorCost.toFixed( 5 ) , remainingEpochs ) ;

	return this.errorCost ;
} ;

