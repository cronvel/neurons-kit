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

const shuffleArray = require( 'array-kit' ).shuffle ;

const fs = require( 'fs' ) ;

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

	this.metadata = {} ;	// e.g. data for the neural evolution algo
}

module.exports = Network ;



Network.prototype.export = function() {
	// We need to compute units order first
	if ( ! this.ready ) { this.init() ; }

	var data = {
		metadata: this.metadata ,
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

	return data ;
} ;



Network.prototype.serialize = function( pretty ) {
	return JSON.stringify( this.export() , null , pretty ? '    ' : null ) ;
} ;



Network.import = function( data ) {
	var unitMap = {} ,
		network = new Network() ;

	network.metadata = data.metadata ;

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
			network.addOutputUnit( unit , name ) ;
		}
		else {
			network.addHiddenUnit( unit , name ) ;
		}

		unitData.s.forEach( synapseData => {
			if ( ! unitMap[ synapseData.i ] ) {
				throw new Error( "Can't unserialize/import, unknown unit id " + synapseData.i ) ;
			}

			unit.addInput( unitMap[ synapseData.i ] , synapseData.w ) ;
		} ) ;
	} ) ;

	network.computeFeedForwardOrder() ;

	if ( data.outputObject ) {
		network.outputObject = true ;
	}

	return network ;
} ;



Network.unserialize = function( str ) {
	var data = JSON.parse( str ) ;
	return Network.import( data ) ;
} ;



Network.prototype.clone = function() {
	var unitMap = {} ,
		network = new Network() ;

	//network.metadata = Object.assign( {} , this.metadata ) ;

	this.inputUnits.forEach( currentUnit => {
		var unit = new SignalEmitter( { id: currentUnit.id } ) ;
		unitMap[ unit.id ] = unit ;
		network.inputUnits.push( unit ) ;
	} ) ;

	this.orderedUnits.forEach( ( currentUnit , index ) => {
		var unit = new Neuron( { id: currentUnit.id , activation: currentUnit.activation , bias: currentUnit.bias } ) ;
		unitMap[ unit.id ] = unit ;
		network.orderedUnits.push( unit ) ;

		if ( index >= this.hiddenUnits.length ) {
			// It's an output unit...
			network.outputUnits.push( unit ) ;
		}
		else {
			// It's an hidden unit...
			network.hiddenUnits.push( unit ) ;
		}

		currentUnit.synapses.forEach( currentSynapse => {
			if ( ! unitMap[ currentSynapse.input.id ] ) {
				throw new Error( "Can't clone, unknown unit id " + currentSynapse.input.id ) ;
			}

			unit.addInput( unitMap[ currentSynapse.input.id ] , currentSynapse.weight ) ;
		} ) ;
	} ) ;

	Object.assign( network.namedInputIndexes , this.namedInputIndexes ) ;
	Object.assign( network.namedOutputIndexes , this.namedOutputIndexes ) ;

	network.ready = this.ready ;

	if ( this.outputObject ) {
		network.outputObject = true ;
	}

	return network ;
} ;



Network.prototype.save = function( filePath ) { return fs.promises.writeFile( filePath , this.serialize() ) ; } ;
Network.load = async function( filePath ) { return Network.unserialize( await fs.promises.readFile( filePath , 'utf8' ) ) ; } ;
Network.prototype.load = async function( filePath ) { Object.assign( this , await Network.load( filePath ) ) ; } ;



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



Network.prototype.addOutputUnit = function( output , id = null ) {
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



Network.prototype.addHiddenUnit = function( unit , id = null , layer = null ) {
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



Network.prototype.removeHiddenUnit = function( unit ) {
	var j , indexOf ;

	indexOf = this.orderedUnits.indexOf( unit ) ;
	if ( indexOf < 0 ) { return ; }

	// Remove all connection having this unit as input
	for ( j = indexOf + 1 ; j < this.orderedUnits.length ; j ++ ) {
		this.orderedUnits[ j ].removeInput( unit ) ;
	}

	// Remove all the synapse of the unit
	unit.synapses.length = 0 ;

	// Remove the unit
	this.orderedUnits.splice( indexOf , 1 ) ;

	indexOf = this.hiddenUnits.indexOf( unit ) ;
	if ( indexOf >= 0 ) { this.hiddenUnits.splice( indexOf , 1 ) ; }
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
			this.addOutputUnit( new Neuron( { activation: activation } ) , typeof outputModel === 'string' ? outputModel : outputModel.id ) ;
		} ) ;
	}
	else if ( typeof model.outputs === 'number' ) {
		count = model.outputs ;
		while ( count -- ) { this.addOutputUnit( new Neuron( { activation: activation } ) ) ; }
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
				layer.push( this.addHiddenUnit( new Neuron( { activation: activation } ) , index , layerIndex ) ) ;
			}

			this.connectLayerDense( layer , lastLayer ) ;
			lastLayer = layer ;
		} ) ;
	}

	// Now to the output
	this.connectLayerDense( this.outputUnits , lastLayer ) ;

	this.computeFeedForwardOrder( true ) ;
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
Network.prototype.computeFeedForwardOrder = function( force = false ) {
	if ( this.ready && ! force ) { return ; }

	var unit , lastSize ;

	this.orderedUnits.length = 0 ;

	var determined = new Set( this.inputUnits ) ;

	// Exclude outputUnits for now, assuming no output unit should be connected to another output unit, allowing faster sort
	//var remaining = new Set( this.hiddenUnits.concat( this.outputUnits ) ) ;
	var remaining = new Set( this.hiddenUnits ) ;

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

	// At this stage, we may want to order hiddenUnits too, so subsequent call will be faster
	this.hiddenUnits.length = 0 ;
	this.hiddenUnits.push( ... this.orderedUnits ) ;

	// Add outputUnits at the end
	this.orderedUnits.push( ... this.outputUnits ) ;

	this.ready = true ;
} ;



// This check if connecting two hidden units is possible, i.e. doesn't produce a loop.
Network.prototype.checkAcyclicHiddenConnection = function( fromUnit , toUnit ) {
	var unit , lastSize ,
		determined = new Set( this.inputUnits ) ,
		remaining = new Set( this.hiddenUnits ) ;

	while ( remaining.size ) {
		if ( remaining.size === lastSize ) { return false ; }

		lastSize = remaining.size ;

		for ( unit of remaining ) {
			if ( unit.synapses.every( synapse => determined.has( synapse.input ) ) ) {
				if ( toUnit !== unit || determined.has( fromUnit ) ) {
					determined.add( unit ) ;
					remaining.delete( unit ) ;
				}
			}
		}
	}

	return true ;
} ;



const randomMinMax = ( min , max ) => min + Math.random() * ( max - min ) ;

Network.prototype.randomize = function( min = -1 , max = 1 ) {
	this.orderedUnits.forEach( unit => {
		unit.bias = randomMinMax( min , max ) ;
		unit.synapses.forEach( synapse => synapse.weight = randomMinMax( min , max ) ) ;
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
	So the gradient descent is not uniform, thus it may avoid few traps.

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



Network.prototype.mutate = function( mutation ) {
	var count = Math.max( 1 , mutation.count + this.hiddenUnits.length * mutation.perUnitCount ) ;

	if ( count > 1 ) {
		count = Math.max( 1 , Math.ceil( count * Math.random() ) ) ;
	}

	while ( count -- ) {
		this.mutateOne( mutation ) ;
	}
} ;



Network.prototype.mutateOne = function( mutation ) {
	var randomEvent = Math.random() ;

	if ( randomEvent < mutation.newConnectionChance ) { return this.mutateAddNewConnection( mutation ) ; }
	randomEvent -= mutation.newConnectionChance ;

	if ( randomEvent < mutation.removeConnectionChance ) { return this.mutateRemoveConnection( mutation ) ; }
	randomEvent -= mutation.removeConnectionChance ;

	if ( randomEvent < mutation.newUnitChance ) { return this.mutateAddNewUnit( mutation ) ; }
	randomEvent -= mutation.newUnitChance ;

	if ( randomEvent < mutation.removeUnitChance ) { return this.mutateRemoveUnit( mutation ) ; }
	randomEvent -= mutation.removeUnitChance ;

	// Only for hidden units
	if ( randomEvent < mutation.mutateActivationChance ) { return this.mutateOneActivation( mutation ) ; }
	randomEvent -= mutation.mutateActivationChance ;

	return this.mutateOneWeight( mutation ) ;
} ;



Network.prototype.mutateOneWeight = function( mutation ) {
	//log.hdebug( "weight mutation" ) ;
	if ( ! this.orderedUnits.length ) { return false ; }
	var unit = this.orderedUnits[ Math.floor( this.orderedUnits.length * Math.random() ) ] ;
	unit.mutateOneWeight( mutation ) ;
	return true ;
} ;



// Only for hidden units
Network.prototype.mutateOneActivation = function( mutation ) {
	//log.hdebug( "activation mutation" ) ;
	if ( ! this.hiddenUnits.length ) { return false ; }
	var unit = this.hiddenUnits[ Math.floor( this.hiddenUnits.length * Math.random() ) ] ;
	return unit.setActivation( mutation.activations[ Math.floor( mutation.activations.length * Math.random() ) ] ) ;
} ;



// Add a connection (or a unit)
Network.prototype.mutateAddNewConnection = function( mutation , createUnit = false ) {
	//log.hdebug( "new connection mutation" ) ;
	var fromIndex , toIndex , fromUnit , toUnit ,
		betweenHidden = true ,
		fromLength = this.hiddenUnits.length + this.inputUnits.length ,
		toLength = this.hiddenUnits.length + this.outputUnits.length ;

	if ( ! fromLength || ! toLength ) { return false ; }

	fromIndex = Math.floor( fromLength * Math.random() ) ;
	if ( fromIndex < this.hiddenUnits.length ) { fromUnit = this.hiddenUnits[ fromIndex ] ; }
	else { fromUnit = this.inputUnits[ fromIndex - this.hiddenUnits.length ] ; betweenHidden = false ; }

	toIndex = Math.floor( toLength * Math.random() ) ;
	if ( toIndex < this.hiddenUnits.length ) { toUnit = this.hiddenUnits[ toIndex ] ; }
	else { toUnit = this.outputUnits[ toIndex - this.hiddenUnits.length ] ; betweenHidden = false ; }

	// First, check that we are not trying to connect the same unit
	if ( toUnit === fromUnit ) { return false ; }

	// Then, check if there is already a connection between both units
	if ( ! createUnit && ( toUnit.hasInput( fromUnit ) || ( fromUnit.hasInput && fromUnit.hasInput( toUnit ) ) ) ) {
		return false ;
	}

	// Check if it would introduce a loop...
	if ( betweenHidden && fromIndex > toIndex && ! this.checkAcyclicHiddenConnection( fromUnit , toUnit ) ) {
		return false ;
	}

	if ( createUnit ) {
		let activation = mutation.activations[ Math.floor( mutation.activations.length * Math.random() ) ] ;
		let newUnit = new Neuron( {
			activation ,
			bias: mutation.newBias()
		} ) ;
		this.addHiddenUnit( newUnit , mutation.newId() ) ;
		toUnit.addInput( newUnit , mutation.newWeight() ) ;
		newUnit.addInput( fromUnit , mutation.newWeight() ) ;

		// Always re-compute feed forward order
		this.computeFeedForwardOrder( true ) ;
	}
	else {
		toUnit.addInput( fromUnit , mutation.newWeight() ) ;

		// Recompute feed-forward order only if necessary
		if ( fromIndex > toIndex ) { this.computeFeedForwardOrder( true ) ; }
	}

	return true ;
} ;



// Add a unit
Network.prototype.mutateAddNewUnit = function( mutation ) {
	//log.hdebug( "new unit mutation" ) ;
	return this.mutateAddNewConnection( mutation , true ) ;
} ;



Network.prototype.mutateRemoveConnection = function( mutation ) {
	//log.hdebug( "remove connection mutation" ) ;
	if ( ! this.orderedUnits.length ) { return false ; }

	// It should have at least two remaining connections and one connection greater than the threshold
	var units = this.orderedUnits.filter( u =>
		u.synapses.length >= 2 && u.synapses.some( s => Math.abs( s.weight ) <= mutation.removeConnectionThreshold )
	) ;

	if ( ! units.length ) { return false ; }

	var unit = units[ Math.floor( units.length * Math.random() ) ] ;
	var synapses = unit.synapses.filter( s => Math.abs( s.weight ) <= mutation.removeConnectionThreshold ) ;

	if ( ! synapses.length ) { return false ; }
	unit.removeSynapse( synapses[ Math.floor( synapses.length * Math.random() ) ] ) ;

	return true ;
} ;



// Only for hidden units
Network.prototype.mutateRemoveUnit = function( mutation ) {
	//log.hdebug( "remove unit mutation" ) ;
	if ( ! this.hiddenUnits.length ) { return false ; }

	var units = this.hiddenUnits.filter( u =>
		u.synapses.reduce( ( a , s ) => a + Math.abs( s.weight ) , 0 ) <= mutation.removeUnitThreshold
	) ;

	if ( ! units.length ) { return false ; }

	var unit = units[ Math.floor( units.length * Math.random() ) ] ;

	this.removeHiddenUnit( unit ) ;

	return true ;
} ;



/*
	Cross-over, a.k.a. breeding, mating, etc...
	It makes an union of both topology, using unit's ID.
	Whenever a unit/connection exist in both network, pick weight/bias/activation/whatever from one of them randomly.
	When it exists only in one instance, use it without any adjustement.
*/
Network.prototype.crossOver = function( withNetwork ) {
	// They need to be oredered
	this.computeFeedForwardOrder() ;
	withNetwork.computeFeedForwardOrder() ;

	var id , name , prefix , indexOf ,
		unitMap = {} ,
		network = this.clone() ;

	// Create a map of all units
	network.inputUnits.forEach( unit => unitMap[ unit.id ] = unit ) ;
	network.hiddenUnits.forEach( unit => unitMap[ unit.id ] = unit ) ;
	network.outputUnits.forEach( unit => unitMap[ unit.id ] = unit ) ;

	withNetwork.orderedUnits.forEach( ( currentUnit , index ) => {
		let unit ;

		if ( ! unitMap[ currentUnit.id ] ) {
			if ( index < withNetwork.hiddenUnits.length ) {
				// This hidden unit doesn't exist, we have to create it
				unit = new Neuron( { id: currentUnit.id , activation: currentUnit.activation , bias: currentUnit.bias } ) ;
				network.hiddenUnits.push( unit ) ;
				unitMap[ unit.id ] = unit ;
			}
			else {
				throw new Error( "Can't cross-over, output unit mismatch" ) ;
			}
		}
		else {
			unit = unitMap[ currentUnit.id ] ;

			// Choose randomly one of the two biases and activations
			if ( Math.random() < 0.5 ) { unit.bias = currentUnit.bias ; }
			if ( Math.random() < 0.5 ) { unit.activation = currentUnit.activation ; }
		}

		currentUnit.synapses.forEach( currentSynapse => {
			if ( ! unitMap[ currentSynapse.input.id ] ) {
				throw new Error( "Can't cross-over, unknown unit id " + currentSynapse.input.id ) ;
			}

			let synapse = unit.synapses.find( s => s.input.id === currentSynapse.input.id ) ;

			if ( synapse ) {
				// Choose randomly one of the two synapses weight
				if ( Math.random() < 0.5 ) { synapse.weight = currentSynapse.weight ; }
			}
			else {
				unit.addInput( unitMap[ currentSynapse.input.id ] , currentSynapse.weight ) ;
			}
		} ) ;
	} ) ;

	network.computeFeedForwardOrder() ;

	return network ;
} ;

