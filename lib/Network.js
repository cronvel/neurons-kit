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
	this.correctionSum = 0 ;

	this.outputObject = false ;	// true if we should output named output instead of an array
	this.inputNameToIndex = {} ;
	this.outputIndexToName = [] ;

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



// Mostly like export, but dedicated to debugging
Network.prototype.debugData = function() {
	var data = {
		metadata: this.metadata ,
		inputs: this.inputUnits.map( u => u.id ) ,
		hiddenUnits: this.hiddenUnits.map( u => u.debugData() ) ,
		outputUnits: this.outputUnits.map( u => u.debugData() )
	} ;

	if ( this.outputObject ) {
		data.outputObject = true ;
	}

	return data ;
} ;



Network.prototype.serialize = function( pretty ) {
	return JSON.stringify( this.export() , null , pretty ? "\t" : null ) ;
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

	if ( data.outputObject ) {
		network.outputObject = true ;
	}

	network.checkUniqueId() ;
	network.computeFeedForwardOrder() ;

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

	Object.assign( network.inputNameToIndex , this.inputNameToIndex ) ;
	network.outputIndexToName = Array.from( this.outputIndexToName ) ;

	network.ready = this.ready ;

	if ( this.outputObject ) {
		network.outputObject = true ;
	}

	return network ;
} ;



Network.prototype.save = function( filePath , pretty = false ) { return fs.promises.writeFile( filePath , this.serialize( pretty ) ) ; } ;
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
		this.inputNameToIndex[ id ] = this.inputUnits.length - 1 ;
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
		this.outputIndexToName.push( id ) ;
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
	if ( model.layers || ! model.unconnected ) {
		this.connectLayerDense( this.outputUnits , lastLayer ) ;
	}

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
	if ( Array.isArray( inputs ) ) {
		let iMax = Math.min( inputs.length , this.inputUnits.length ) ;

		for ( let i = 0 ; i < iMax ; i ++ ) {
			this.inputUnits[ i ].signal = inputs[ i ] ;
		}
	}
	else {
		// Named input
		for ( let name of Object.keys( inputs ) ) {
			if ( Object.hasOwn( this.inputNameToIndex , name ) ) {
				this.inputUnits[ this.inputNameToIndex[ name ] ].signal = inputs[ name ] ;
			}
		}
	}
} ;



Network.prototype.getOutputs = function() {
	return this.outputUnits.map( output => output.signal ) ;
} ;



Network.prototype.getNamedOutputs = function() {
	var output = {} ;

	for ( let index = 0 ; index < this.outputUnits.length ; index ++ ) {
		output[ this.outputIndexToName[ index ] ] = this.outputUnits[ index ].signal ;
	}

	return output ;
} ;



Network.prototype.toOutputArray = function( namedOutput ) {
	var output = new Array( this.outputUnits.length ) ;

	for ( let index = 0 ; index < this.outputUnits.length ; index ++ ) {
		let name = this.outputIndexToName[ index ] ;
		output[ index ] = Object.hasOwn( namedOutput , name ) ? namedOutput[ name ] : 0 ;
	}

	return output ;
} ;



Network.prototype.getUnitById = function( id ) {
	var unit ;

	unit = this.inputUnits.find( u => u.id === id ) ;
	if ( unit ) { return unit ; }

	unit = this.outputUnits.find( u => u.id === id ) ;
	if ( unit ) { return unit ; }

	unit = this.hiddenUnits.find( u => u.id === id ) ;
	if ( unit ) { return unit ; }
} ;



Network.prototype.init =
Network.prototype.computeFeedForwardOrder = function( force = false , removeCycles = false ) {
	if ( this.ready && ! force ) { return ; }

	var unit , nextUnit , synapse , cycle , index , removedConnection , lastSize = null ;

	this.orderedUnits.length = 0 ;

	var determined = new Set( this.inputUnits ) ;

	// Exclude outputUnits for now, assuming no output unit should be connected to another output unit, allowing faster sort
	//var remaining = new Set( this.hiddenUnits.concat( this.outputUnits ) ) ;
	var remaining = new Set( this.hiddenUnits ) ;

	while ( remaining.size ) {
		if ( remaining.size === lastSize ) {
			if ( removeCycles ) {
				cycle = this.findCycle( remaining ) ;

				if ( ! cycle ) {
					log.error( "Bad network (cyclic or with external references), but no cycle found\nNetwork: %[5l50000]Y\nRemaining: %[5l50000]Y" , this.debugData() , [ ... remaining ].map( u => u.debugData() ) ) ;
					throw new Error( "Bad network (cyclic or with external references), but no cycle found" ) ;
				}

				//log.hdebug( "Found cycle: %[5l50000]Y" , cycle && cycle.map( e => e.debugData() ) ) ;
				// Choose a random unit where to cut the loop
				index = Math.floor( cycle.length * Math.random() ) ;
				unit = cycle[ index ] ;
				nextUnit = cycle[ ( index + 1 ) % cycle.length ] ;
				unit.removeInput( nextUnit ) ;
				//log.hdebug( "Removed link between %[5l50000]Y and %[5l50000]Y" , unit.debugData() , nextUnit.debugData() ) ;
				lastSize = null ;
				continue ;
			}

			log.error( "Bad network (cyclic or with external references)\nNetwork: %[5l50000]Y\nRemaining: %[5l50000]Y" , this.debugData() , [ ... remaining ].map( u => u.debugData() ) ) ;
			throw new Error( "Bad network (cyclic or with external references)" ) ;
		}

		lastSize = remaining.size ;

		for ( unit of remaining ) {
			if ( unit.synapses.every( synapse_ => determined.has( synapse_.input ) ) ) {
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



// This checks if connecting two hidden units is possible, i.e. doesn't produce a loop.
Network.prototype.checkAcyclicHiddenConnection = function( fromUnit , toUnit ) {
	return ! this.hasUpstreamUnit( fromUnit , toUnit ) ;
} ;



Network.prototype.hasUpstreamUnit = function( unit , upstreamUnit ) {
	var runtime = {
		upstreamUnit ,
		inputSet: new Set( this.inputUnits ) ,
		seen: new Set()
	} ;

	return this._hasUpstreamUnit( runtime , unit ) ;
} ;



Network.prototype._hasUpstreamUnit = function( runtime , unit ) {
	var synapse ;

	if ( unit === runtime.upstreamUnit ) { return true ; }
	if ( runtime.inputSet.has( unit ) || runtime.seen.has( unit ) ) { return false ; }
	runtime.seen.add( unit ) ;

	for ( synapse of unit.synapses ) {
		if ( this._hasUpstreamUnit( runtime , synapse.input ) ) { return true ; }
	}

	return false ;
} ;



// Search and return the first cycle found in a Set of units, or in .hiddenUnits
Network.prototype.findCycle = function( inUnits = new Set( this.hiddenUnits ) ) {
	var unit , cycle ,
		runtime = {
			inUnits ,
			chain: [] ,
			seen: new Set()
		} ;

	for ( unit of inUnits ) {
		if ( ( cycle = this._findCycleRecursive( runtime , unit ) ) ) { return cycle ; }
	}
} ;



Network.prototype._findCycleRecursive = function( runtime , unit ) {
	var synapse , indexOf , cycle ;

	if ( ( indexOf = runtime.chain.indexOf( unit ) ) !== -1 ) {
		return runtime.chain.slice( indexOf ) ;
	}

	if ( ! runtime.inUnits.has( unit ) || runtime.seen.has( unit ) ) { return false ; }

	runtime.chain.push( unit ) ;
	runtime.seen.add( unit ) ;

	for ( synapse of unit.synapses ) {
		if ( ( cycle = this._findCycleRecursive( runtime , synapse.input ) ) ) { return cycle ; }
	}

	runtime.chain.pop() ;

	return false ;
} ;



const randomMinMax = ( min , max ) => min + Math.random() * ( max - min ) ;

Network.prototype.randomize = function( min = -1 , max = 1 ) {
	this.orderedUnits.forEach( unit => {
		unit.bias = randomMinMax( min , max ) ;
		unit.synapses.forEach( synapse => synapse.weight = randomMinMax( min , max ) ) ;
	} ) ;
} ;



Network.prototype.forwardSignal = function() {
	if ( ! this.ready ) { this.init() ; }
	for ( let unit of this.orderedUnits ) { unit.forwardSignal() ; }
} ;



// Fully process an input and return the output
Network.prototype.process = function( inputs , namedOutput = this.outputObject ) {
	this.setInputs( inputs ) ;
	this.forwardSignal() ;
	return namedOutput ? this.getNamedOutputs() : this.getOutputs() ;
} ;



/*
	Given an input array, return the chosen policy (an output index or output name).

	Arguments:
		* inputs: array of input or object of named input
		* exploration: number, if set, a random number between 0 and this value is added to each policy before choosing the greater,
		  allowing the agent to choose other valuable options, hence better explore its environment
		* reinforcementLearning: an optional ReinforcementLearning instance can be passed, it will be updated accordingly
		* namedOutput: boolean, true if named output is prefered, if not set, set it to the Network's default
*/
Network.prototype.processPolicy = function( inputs , exploration = 0 , reinforcementLearning = null , namedOutput = this.outputObject ) {
	this.setInputs( inputs ) ;
	this.forwardSignal() ;

	var policy = -1 ,
		maxScore = -Infinity ,
		expectedReward = -Infinity ;

	for ( let index = 0 ; index < this.outputUnits.length ; index ++ ) {
		let currentExpectedReward = this.outputUnits[ index ].signal ;
		let score = currentExpectedReward ;
		if ( exploration ) { score += exploration * Math.random() ; }
		if ( score > maxScore ) {
			maxScore = score ;
			policy = index ;
			expectedReward = currentExpectedReward ;
		}
	}

	if ( reinforcementLearning ) {
		reinforcementLearning.addSample( inputs , policy , expectedReward ) ;
	}

	//log.debug( "input: %s , output: %s" , inputs , outputs ) ;

	return namedOutput ? this.outputIndexToName[ policy ] : policy ;
} ;



Network.prototype.stackError = function( expectedVector , errorVector ) {
	if ( expectedVector.length !== this.outputUnits.length ) {
		throw new Error( 'computeError(): expected output length mismatch' ) ;
	}

	expectedVector.forEach( ( expected , index ) => errorVector.push( this.outputUnits[ index ].signal - expected ) ) ;
	//log.debug( "expected: %s" , expectedVector ) ;
} ;



Network.prototype.costFunction = function( errorVector , correctionSignal ) {
	//log.debug( "errorVector: %Y" , errorVector ) ;
	this.errorCost = Math.hypot( ... errorVector ) ;

	if ( this.errorCost ) {
		errorVector.forEach( ( error , index ) => correctionSignal[ index ] = -error / this.errorCost ) ;
	}
	else {
		errorVector.forEach( ( error , index ) => correctionSignal[ index ] = 0 ) ;
	}

	//log.debug( "errorCost: %s" , this.errorCost.toFixed( 5 ) ) ;
	return this.errorCost ;
} ;



Network.prototype.setCorrectionSignal = function( correctionSignal , round = 0 ) {
	var i ,
		iMax = this.outputUnits.length ,
		offset = round * this.outputUnits.length ;

	// Reset all correctionSignal
	this.correctionSum = 0 ;
	this.orderedUnits.forEach( unit => {
		unit.correctionSignal = 0 ;
		unit.biasCorrection = 0 ;
		unit.synapses.forEach( synapse => synapse.correction = 0 ) ;
	} ) ;

	// Set output correctionSignal
	for ( i = 0 ; i < iMax ; i ++ ) {
		this.outputUnits[ i ].correctionSignal = correctionSignal[ i + offset ] ;
	}
} ;



Network.prototype.backwardCorrectionSignal = function( slippyDerivative = false ) {
	var i = this.orderedUnits.length ;

	while ( i -- ) {
		this.correctionSum += this.orderedUnits[ i ].backwardCorrectionSignal( slippyDerivative ) ;
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
		unit.correctionSignal = 0 ;

		// For the bias
		unit.biasCorrectionMomentum = baseRate * unit.biasCorrection * rate + momentumRate * unit.biasCorrectionMomentum ;
		unit.bias += unit.biasCorrectionMomentum ;
		unit.biasCorrection = 0 ;

		// For each synapse
		unit.synapses.forEach( synapse => {
			synapse.correctionMomentum = baseRate * synapse.correction * rate + momentumRate * synapse.correctionMomentum ;
			synapse.weight += synapse.correctionMomentum ;
			synapse.correction = 0 ;
		} ) ;

		/*
		var str = '' ;
		unit.synapses.forEach( ( s , i ) => str += ' W' + i + ': ' + s.weight.toFixed( 5 ) + ' (Δ' + s.correctionMomentum.toFixed( 5 ) + ')' ) ;
		log.debug( "CR Neuron --%s bias: %s (Δ%s)" , str , unit.bias.toFixed( 5 ) , unit.biasCorrectionMomentum.toFixed( 5 ) ) ;
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

	var correctionSum , correctionSignalSquaredSum , correctionSignalAvg , correctionSignalNorm ,
		errorSum , lastErrorAvg , errorAvg , errorSquaredSum , errorNorm ,
		stallBoostFactor ,
		expectedVector = [] , errorVector = [] , correctionSignal = [] ,
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

		correctionSum = 0 ;
		correctionSignalSquaredSum = 0 ;
		errorSum = 0 ;
		errorSquaredSum = 0 ;

		samples.forEach( sample => {
			//log.debug( "---" ) ;
			var [ input , expected ] = sample ;

			// Reset
			expectedVector.length = 0 ;
			errorVector.length = 0 ;
			correctionSignal.length = 0 ;
			// ---

			this.process( input , false ) ;
			this.stackError( expected , errorVector ) ;
			this.costFunction( errorVector , correctionSignal ) ;

			if ( this.errorCost < maxError ) { return ; }

			this.setCorrectionSignal( correctionSignal ) ;
			this.backwardCorrectionSignal( slippyDerivative ) ;

			correctionSum += this.correctionSum ;
			correctionSignalSquaredSum += this.correctionSum * this.correctionSum ;
			errorSum += this.errorCost ;
			errorSquaredSum += this.errorCost * this.errorCost ;
			this.adapt( adaptRate , momentumRate ) ;
		} ) ;

		correctionSignalAvg = correctionSum / samples.length ;
		correctionSignalNorm = Math.sqrt( correctionSignalSquaredSum ) ;
		lastErrorAvg = errorAvg ;
		errorAvg = errorSum / samples.length ;
		errorNorm = Math.sqrt( errorSquaredSum ) ;

		// /!\ or use errorNorm? or some mean average?
		if ( errorAvg <= maxError ) { break ; }

		// Modify the adapt rate
		// This part is really experimental, it's not easy to figure out how to move the adapt rate
		if ( lastErrorAvg && correctionSignalNorm ) {
			lastWantedAdaptRate = wantedAdaptRate ;
			wantedAdaptRate = learningRate * Math.min( errorAvg , lastErrorAvg ) / correctionSignalNorm ;

			if ( errorAvg < lastErrorAvg * 1.01 ) {
				stallBoostFactor = Math.min( lastErrorAvg / ( 2 * ( lastErrorAvg * 1.01 - errorAvg ) ) , correctionSignalNorm ) ;
				if ( stallBoostFactor > 1 ) {
					log.debug( ">>> stallBoostFactor: %s" , stallBoostFactor.toFixed( 5 ) ) ;
					wantedAdaptRate *= stallBoostFactor ;
				}
			}

			adaptRate = Math.min( wantedAdaptRate , lastWantedAdaptRate ) ;
		}

		log.info( ">>> Epoch average error: %s error norm: %s average delta: %s delta norm: %s next adaptRate: %s (%s)" , errorAvg.toFixed( 5 ) , errorNorm.toFixed( 5 ) , correctionSignalAvg.toFixed( 5 ) , correctionSignalNorm.toFixed( 5 ) , adaptRate.toFixed( 5 ) , remainingEpochs ) ;
	}

	log.info( "Last epoch average error: %s error norm: %s average delta: %s delta norm: %s (%s)" , errorAvg.toFixed( 5 ) , errorNorm.toFixed( 5 ) , correctionSignalAvg.toFixed( 5 ) , correctionSignalNorm.toFixed( 5 ) , remainingEpochs ) ;

	return errorAvg ;
} ;



// /!\ There is something wrong with this algorithm, it doesn't converge...
Network.prototype.trainBatch = function( samples , options = {} ) {
	if ( ! samples.length ) { return ; }

	var errorSum , errorAvg , errorSquaredSum , errorNorm ,
		expectedVector = [] , errorVector = [] , correctionSignal = [] ,
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
		correctionSignal.length = 0 ;
		// ---

		samples.forEach( sample => {
			log.debug( "---" ) ;
			var [ input , expected ] = sample ;

			this.process( input , false ) ;
			this.stackError( expected , errorVector ) ;
		} ) ;

		this.costFunction( errorVector , correctionSignal ) ;

		if ( this.errorCost < maxError ) { break ; }

		adaptRate = learningRate * this.errorCost ;
		log.debug( ">>> Adapt phase -- errorCost: %s adaptRate: %s (%s)" , this.errorCost.toFixed( 5 ) , adaptRate.toFixed( 5 ) , remainingEpochs ) ;

		samples.forEach( ( sample , index ) => {
			var input = sample[ 0 ] ;

			// We need to forward the input again... not very optimized...
			this.process( input , false ) ;

			this.setCorrectionSignal( correctionSignal , index ) ;
			this.backwardCorrectionSignal( slippyDerivative ) ;
		} ) ;

		this.adapt( adaptRate , momentumRate ) ;

		log.debug( '>>> End of epoch' ) ;
	}

	log.debug( 'Last epoch average error: %s (%s)' , this.errorCost.toFixed( 5 ) , remainingEpochs ) ;

	return this.errorCost ;
} ;



// Importance of the mutation
Network.WEIGHT_IMPORTANCE = 1 ;
Network.MOMENTUM_IMPORTANCE = 1 ;
Network.ACTIVATION_IMPORTANCE = 1.5 ;
Network.NEW_CONNECTION_IMPORTANCE = 3 ;
Network.REMOVE_CONNECTION_IMPORTANCE = 3 ;
Network.NEW_UNIT_IMPORTANCE = 5 ;
Network.REMOVE_UNIT_IMPORTANCE = 5 ;
//Network.CROSS_OVER_IMPORTANCE = 25 ;



Network.prototype.mutate = function( mutation , newUnitId = null , fromNetwork = null ) {
	var importance = 0 , count ;

	if ( fromNetwork && fromNetwork.metadata.momentumCount && fromNetwork.metadata.momentum && mutation.momentumChance && Math.random() < mutation.momentumChance ) {
		fromNetwork.metadata.momentumCount -- ;
		//if ( ! fromNetwork.metadata.momentumCount ) { log.hdebug( "All momentum consumed" ) ; }
		//log.hdebug( "mc: %i" , fromNetwork.metadata.momentumCount ) ;
		importance += this.mutateMomentum( fromNetwork.metadata.momentum , mutation.momentumInBetweenChance && Math.random() < mutation.momentumInBetweenChance ) ;
		return importance ;
	}

	count = Math.max( 1 , mutation.count + this.hiddenUnits.length * mutation.perUnitCount ) ;

	if ( count > 1 ) {
		count = Math.max( 1 , Math.ceil( count * Math.random() ) ) ;
	}

	while ( count -- ) {
		importance += this.mutateOne( mutation , newUnitId ) ;
	}

	return importance ;
} ;



Network.prototype.mutateOne = function( mutation , newUnitId = null ) {
	var randomEvent = Math.random() ;

	if ( randomEvent < mutation.newConnectionChance ) { return this.mutateAddNewConnection( mutation ) ; }
	randomEvent -= mutation.newConnectionChance ;

	if ( randomEvent < mutation.removeConnectionChance ) { return this.mutateRemoveConnection( mutation ) ; }
	randomEvent -= mutation.removeConnectionChance ;

	if ( randomEvent < mutation.newUnitChance ) { return this.mutateAddNewUnit( mutation , newUnitId ) ; }
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
	if ( ! this.orderedUnits.length ) { return 0 ; }
	var unit = this.orderedUnits[ Math.floor( this.orderedUnits.length * Math.random() ) ] ;
	var mutated = unit.mutateOneWeight( mutation ) ;

	this.metadata.momentumCount = mutation.momentumCount ;

	if ( ! this.metadata.momentum ) { this.metadata.momentum = {} ; }
	if ( ! this.metadata.momentum[ unit.id ] ) { this.metadata.momentum[ unit.id ] = {} ; }
	this.metadata.momentum[ unit.id ][ mutated[ 0 ] ] = mutated[ 1 ] ;

	return Network.WEIGHT_IMPORTANCE ;
} ;



// inBetween mode is used when we could have missed an optimum because we have made a big jump
Network.prototype.mutateMomentum = function( momentum , inBetween = false ) {
	var unitId , unit , inputUnitId , synapse , delta , rate ;
	//var importance = 0 ;

	//rate = inBetween ? Math.random() : ( 0.618 + Math.random() ) ** 2 ;
	rate = inBetween ?   0.25 + Math.random() / 2   :   0.2 + Math.random() ;

	if ( inBetween ) { delete this.metadata.momentum ; }
	else if ( ! this.metadata.momentum ) { this.metadata.momentum = {} ; }

	this.metadata.muCode = ( this.metadata.muCode || '' ) + 'Mom' ;

	for ( unitId in momentum ) {
		unit = this.getUnitById( unitId ) ;
		if ( ! unit ) { continue ; }

		if ( ! inBetween && ! this.metadata.momentum[ unitId ] ) { this.metadata.momentum[ unitId ] = {} ; }

		for ( inputUnitId in momentum[ unitId ] ) {
			delta = momentum[ unitId ][ inputUnitId ] * rate ;

			if ( inputUnitId === 'bias' ) {
				if ( inBetween ) {
					unit.bias -= delta ;
				}
				else {
					unit.bias += delta ;
					this.metadata.momentum[ unitId ][ inputUnitId ] = delta ;
				}

				//importance += Network.WEIGHT_IMPORTANCE ;
			}
			else {
				synapse = unit.getSynapseById( inputUnitId ) ;
				if ( ! synapse ) { continue ; }

				if ( inBetween ) {
					//log.hdebug( "Changing weight (inBetween) from %[.3]f to %[.3]f" , synapse.weight , synapse.weight - delta ) ;
					synapse.weight -= delta ;
				}
				else {
					//log.hdebug( "Changing weight from %[.3]f to %[.3]f" , synapse.weight , synapse.weight + delta ) ;
					synapse.weight += delta ;
					this.metadata.momentum[ unitId ][ inputUnitId ] = delta ;
				}

				//importance += Network.WEIGHT_IMPORTANCE ;
			}
		}
	}

	//log.hdebug( "Momentum -- rate %[.3]f\nfrom momentum: %J\nnew momentum: %J" , rate , momentum , this.metadata.momentum ) ;

	//return importance ;
	return Network.MOMENTUM_IMPORTANCE ;
} ;



// Only for hidden units
Network.prototype.mutateOneActivation = function( mutation ) {
	//log.hdebug( "activation mutation" ) ;
	if ( ! this.hiddenUnits.length ) { return 0 ; }
	var unit = this.hiddenUnits[ Math.floor( this.hiddenUnits.length * Math.random() ) ] ;
	var changed = unit.setActivation( mutation.activations[ Math.floor( mutation.activations.length * Math.random() ) ] ) ;
	return changed ? Network.ACTIVATION_IMPORTANCE : 0 ;
} ;



// Add a connection (or a unit)
Network.prototype.mutateAddNewConnection = function( mutation , newUnitId = null ) {
	//log.hdebug( "new connection mutation" ) ;
	var fromIndex , toIndex , fromUnit , toUnit ,
		betweenHidden = true ,
		fromLength = this.hiddenUnits.length + this.inputUnits.length ,
		toLength = this.hiddenUnits.length + this.outputUnits.length ;

	if ( ! fromLength || ! toLength ) { return 0 ; }

	fromIndex = Math.floor( fromLength * Math.random() ) ;
	if ( fromIndex < this.hiddenUnits.length ) { fromUnit = this.hiddenUnits[ fromIndex ] ; }
	else { fromUnit = this.inputUnits[ fromIndex - this.hiddenUnits.length ] ; betweenHidden = false ; }

	toIndex = Math.floor( toLength * Math.random() ) ;
	if ( toIndex < this.hiddenUnits.length ) { toUnit = this.hiddenUnits[ toIndex ] ; }
	else { toUnit = this.outputUnits[ toIndex - this.hiddenUnits.length ] ; betweenHidden = false ; }

	// First, check that we are not trying to connect the same unit
	if ( toUnit === fromUnit ) { return 0 ; }

	// Then, check if there is already a connection between both units
	if ( ! newUnitId && ( toUnit.hasInput( fromUnit ) || ( fromUnit.hasInput && fromUnit.hasInput( toUnit ) ) ) ) {
		return 0 ;
	}

	// Check if it would introduce a loop...
	if ( betweenHidden && fromIndex > toIndex && ! this.checkAcyclicHiddenConnection( fromUnit , toUnit ) ) {
		return 0 ;
	}

	if ( newUnitId ) {
		let id = newUnitId( 'mu' , fromUnit , toUnit ) ;
		//log.hdebug( "id: %s" , id ) ;

		if ( this.getUnitById( 'h:' + id ) ) {
			// The unit is already existing, so we do not duplicate it
			return 0 ;
		}

		let activation = mutation.activations[ Math.floor( mutation.activations.length * Math.random() ) ] ;
		let newUnit = new Neuron( {
			activation ,
			bias: mutation.newBias()
		} ) ;
		this.addHiddenUnit( newUnit , id ) ;
		newUnit.addInput( fromUnit , mutation.newWeight() ) ;
		toUnit.addInput( newUnit , mutation.newWeight() ) ;

		// Always re-compute feed forward order
		try {
			this.checkUniqueId() ;
			this.computeFeedForwardOrder( true ) ;
		}
		catch ( error ) {
			log.error( "New unit error!!!\nfromIndex: %i\ntoIndex: %i\nNew unit: %[5l50000]Y\nFinal network %[5l500000]Y" , fromIndex , toIndex , newUnit.debugData() , this.debugData() ) ;
			throw error ;
		}

		return Network.NEW_UNIT_IMPORTANCE ;
	}

	toUnit.addInput( fromUnit , mutation.newWeight() ) ;

	// Recompute feed-forward order only if necessary
	if ( fromIndex > toIndex ) {
		try {
			this.computeFeedForwardOrder( true ) ;
		}
		catch ( error ) {
			log.error( "New connection error!!!\nfromIndex: %i\ntoIndex: %i\nFinal network %[5l500000]Y" , fromIndex , toIndex , this.debugData() ) ;
			throw error ;
		}
	}

	return Network.NEW_CONNECTION_IMPORTANCE ;
} ;



function defaultNewUnitId() { return 'noop' ; }

// Add a unit
Network.prototype.mutateAddNewUnit = function( mutation , newUnitId ) {
	//log.hdebug( "new unit mutation" ) ;
	return this.mutateAddNewConnection( mutation , newUnitId || defaultNewUnitId ) ;
} ;



Network.prototype.mutateRemoveConnection = function( mutation ) {
	//log.hdebug( "remove connection mutation" ) ;
	if ( ! this.orderedUnits.length ) { return 0 ; }

	// It should have at least two remaining connections and one connection greater than the threshold
	var units = this.orderedUnits.filter( u =>
		u.synapses.length >= 2 && u.synapses.some( s => Math.abs( s.weight ) <= mutation.removeConnectionThreshold )
	) ;

	if ( ! units.length ) { return 0 ; }

	var unit = units[ Math.floor( units.length * Math.random() ) ] ;
	var synapses = unit.synapses.filter( s => Math.abs( s.weight ) <= mutation.removeConnectionThreshold ) ;

	if ( ! synapses.length ) { return 0 ; }
	unit.removeSynapse( synapses[ Math.floor( synapses.length * Math.random() ) ] ) ;

	return Network.REMOVE_CONNECTION_IMPORTANCE ;
} ;



// Only for hidden units
Network.prototype.mutateRemoveUnit = function( mutation ) {
	//log.hdebug( "remove unit mutation" ) ;
	if ( ! this.hiddenUnits.length ) { return 0 ; }

	var units = this.hiddenUnits.filter( u =>
		u.synapses.reduce( ( a , s ) => a + Math.abs( s.weight ) , 0 ) <= mutation.removeUnitThreshold
	) ;

	if ( ! units.length ) { return 0 ; }

	var unit = units[ Math.floor( units.length * Math.random() ) ] ;

	this.removeHiddenUnit( unit ) ;

	return Network.REMOVE_UNIT_IMPORTANCE ;
} ;



/*
	Cross-over, a.k.a. breeding, mating, etc...
	It makes an union of both topology, using unit's ID.
	Whenever a unit/connection exist in both network, pick weight/bias/activation/whatever from one of them randomly.
	When it exists only in one instance, use it without any adjustement.
*/
Network.prototype.crossOver = function( withNetwork ) {
	// They need to be ordered
	this.computeFeedForwardOrder() ;
	withNetwork.computeFeedForwardOrder() ;
	//log.hdebug( "Cross over: parent #1: %[5l50000]Y\nparent #2: %[5]Y" , this.debugData() , withNetwork.debugData() ) ;

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
				//log.hdebug( "Cross over: add unit %[5l50000]Y" , unit ) ;
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

	//log.hdebug( "Cross over: final network before ff order %[5l50000]Y" , network.debugData() ) ;
	try {
		// Cross-over can produce cycles, so we activate the 'removeCycle' option
		network.checkUniqueId() ;
		network.computeFeedForwardOrder( true , true ) ;
	}
	catch ( error ) {
		log.error( "Cross over error!!!\nParent #1: %[5l50000]Y\nParent #2: %[5l50000]Y\nFinal network %[5l50000]Y" , this.debugData() , withNetwork.debugData() , network.debugData() ) ;
		throw error ;
	}
	//log.hdebug( "Cross over: final network %[5l50000]Y" , network.debugData() ) ;

	return network ;
} ;



/*
	Return a rate between 0 and 1 of the compatibility.

	Params:
		withNetwork: the network to compare to
		unitImportance: value of a unit compared to a connection, default to 3 times the importance of a connection
*/
Network.prototype.computeCompatibility = function( withNetwork , unitImportance = 3 ) {
	var rate , sum ,
		singleSidedUnits = new Set() ,
		doubleSidedUnits = new Set() ,
		singleSidedConnections = new Set() ,
		doubleSidedConnections = new Set() ;

	//this.hiddenUnits.forEach( unit => {
	[ ... this.hiddenUnits , ... this.outputUnits ].forEach( unit => {
		singleSidedUnits.add( unit.id ) ;
		unit.synapses.forEach( synapse => {
			singleSidedConnections.add( unit.id + '|' + synapse.input.id ) ;
		} ) ;
	} ) ;

	//withNetwork.hiddenUnits.forEach( unit => {
	[ ... withNetwork.hiddenUnits , ... withNetwork.outputUnits ].forEach( unit => {
		if ( singleSidedUnits.has( unit.id ) ) {
			singleSidedUnits.delete( unit.id ) ;
			doubleSidedUnits.add( unit.id ) ;

			unit.synapses.forEach( synapse => {
				var key = unit.id + '|' + synapse.input.id ;

				if ( singleSidedConnections.has( key ) ) {
					singleSidedConnections.delete( key ) ;
					doubleSidedConnections.add( key ) ;
				}
				else {
					singleSidedConnections.add( key ) ;
				}
			} ) ;
		}
		else {
			singleSidedUnits.add( unit.id ) ;
			unit.synapses.forEach( synapse => {
				singleSidedConnections.add( unit.id + '|' + synapse.input.id ) ;
			} ) ;
		}
	} ) ;

	sum = ( ( singleSidedUnits.size + doubleSidedUnits.size ) * unitImportance + singleSidedConnections.size + doubleSidedConnections.size ) ;
	rate = sum ? ( doubleSidedUnits.size * unitImportance + doubleSidedConnections.size ) / sum : 1 ;

	//log.hdebug( "%N" , {rate,sum,unitImportance,ssu:singleSidedUnits.size,dsu:doubleSidedUnits.size,ssc:singleSidedConnections.size,dsc:doubleSidedConnections.size} ) ;
	return rate ;
} ;



// DEBUG ONLY

Network.prototype.checkUniqueId = function() {
	var ids = new Set() , duplicatedIds = new Set() ;

	[ ... this.inputUnits , ... this.hiddenUnits , ... this.outputUnits ].forEach( unit => {
		if ( ids.has( unit.id ) ) {
			duplicatedIds.add( unit.id ) ;
		}
		else {
			ids.add( unit.id ) ;
		}
	} ) ;

	if ( duplicatedIds.size ) {
		log.error( "Duplicated IDs!!! %N" , [ ... duplicatedIds ] ) ;
		throw new Error( "Duplicated IDs" ) ;
	}
} ;

