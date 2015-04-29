/*
	The Cedric's Swiss Knife (CSK) - CSK neurons toolbox

	Copyright (c) 2015 Cédric Ronvel 
	
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



// Create the object & export it
var nk = {} ;
module.exports = nk ;





			/* Generic SignalEmitter */



nk.SignalEmitter = function SignalEmitter() {} ;

nk.createSignalEmitter = function createSignalEmitter( options , emitter )
{
	if ( ! ( emitter instanceof nk.SignalEmitter ) ) { emitter = Object.create( nk.SignalEmitter.prototype ) ; }
	
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	emitter.network = null ;
	emitter.stateId = 0 ;
	emitter.signal = options.signal !== undefined ? options.signal : 0 ;
	emitter.backSignals = [] ;
	
	return emitter ;
} ;



nk.SignalEmitter.prototype.connectTo = function connectTo( neuron , weight )
{
	if ( ! ( neuron instanceof nk.Neuron ) ) { throw new TypeError( '[signal] .connectTo(): arguments #0 should be an instance of Neuron' ) ; }
	
	neuron.synapses.push( nk.createSynapse( this , weight ) ) ;
	if ( neuron.network ) { neuron.network.stateId ++ ; }
} ;





			/* Neuron */



nk.Neuron = function Neuron() {} ;
nk.Neuron.prototype = Object.create( nk.SignalEmitter.prototype ) ;
nk.Neuron.prototype.constructor = nk.Neuron ;



nk.createNeuron = function createNeuron( options , neuron )
{
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
nk.Neuron.prototype.forwardSignal = function forwardSignal( networkRecursive )
{
	var i , sum = 0 ;
	
	networkRecursive = this.network && !! networkRecursive ;
	
	sum -= this.threshold ;
	
	//console.log( sum ) ;
	
	for ( i = 0 ; i < this.synapses.length ; i ++ )
	{
		if (
			networkRecursive &&
			this.synapses[ i ].emitter.stateId < this.network.stateId &&
			this.synapses[ i ].emitter instanceof nk.Neuron )
		{
			//console.log( "###" , this.synapses[ i ].emitter.stateId , this.synapses[ i ].emitter.network.stateId , this.network.stateId )
			this.synapses[ i ].emitter.forwardSignal( true ) ;
		}
		
		sum += this.synapses[ i ].emitter.signal * this.synapses[ i ].weight ;
		//console.log( this.synapses[ i ] ) ;
		//console.log( sum ) ;
	}
	
	sum *= this.scale ;
	
	this.signal = this.transfer( sum ) ;
	if ( networkRecursive ) { this.stateId = this.network.stateId ; }
} ;



// /!\ Back signals should be reset network-wide before calling this

// Create the backward input back-signal from the output back-signal
nk.Neuron.prototype.backwardSignal = function backwardSignal( networkRecursive )
{
	var i , rootSignal , rootBackSignal , weightSum , backSignal , errorRate , inputSum , inputAverage ,
		weightAdjustementRate , backSignalAdjustementRate , currentAdjustementRate ;
	
	networkRecursive = this.network && !! networkRecursive ;
	
	// No backSignal to backwark propagate
	if ( ! this.backSignals.length ) { return ; }
	
	// First compute a unique backSignal, from the weighted backSignals
	
	weightSum = 0 ;
	backSignal = 0 ;
	console.log( this.backSignals ) ;
	
	for ( i = 0 ; i < this.backSignals.length ; i ++ )
	{
		backSignal = this.backSignals[ i ].signal * this.backSignals[ i ].weight ;
		weightSum += this.backSignals[ i ].weight ;
	}
	
	// No weight, no backward signal
	if ( weightSum === 0 ) { return ; }
	
	//console.log( "backSignal: %s , weightSum: %s" , backSignal , weightSum ) ;
	backSignal /= weightSum ;
	
	if ( this.signal === backSignal )
	{
		// It's ok: backSignal === signal
	}
	
	rootBackSignal = this.transfer.inverse( backSignal ) ;
	rootBackSignal /= this.scale ;
	rootBackSignal += this.threshold ;
	
	rootSignal = this.transfer.inverse( this.signal ) ;
	rootSignal /= this.scale ;
	rootSignal += this.threshold ;
	
	errorRate = ( rootBackSignal - rootSignal ) / rootSignal ;
	
	console.log( "rootBackSignal: %s , rootSignal: %s , errorRate:%s" , rootBackSignal , rootSignal , errorRate ) ;
	inputSum = 0 ;
	for ( i = 0 ; i < this.synapses.length ; i ++ )
	{
		inputSum += this.synapses[ i ].emitter.signal ;
	}
	inputAverage = inputSum / this.synapses.length ;
	
	weightAdjustementRate = 0.5 ;
	backSignalAdjustementRate = 0.5 ;
	
	for ( i = 0 ; i < this.synapses.length ; i ++ )
	{
		currentAdjustementRate = this.synapses[ i ].emitter.signal / inputAverage * weightAdjustementRate ;
		this.synapses[ i ].weight *= ( 1 + errorRate * currentAdjustementRate ) ;
		
		this.synapses[ i ].emitter.backSignals.push( {
			signal: this.synapses[ i ].emitter.signal * ( 1 + errorRate * backSignalAdjustementRate ) ,
			weight: this.synapses[ i ].weight
		} ) ;
		
		//console.log( this.synapses[ i ] ) ;
	}
} ;





			/* Synpase */



nk.Synapse = function Synapse() {} ;

nk.createSynapse = function createSynapse( emitter , weight )
{
	var synapse = Object.create( nk.Synapse.prototype ) ;
	
	if ( ! ( emitter instanceof nk.SignalEmitter ) ) { throw new TypeError( '[synapse] .createSynpase(): arguments #0 should be an instance of SignalEmitter' ) ; }
	
	synapse.emitter = emitter ;
	synapse.weight = weight !== undefined ? weight : 1 ;
	
	return synapse ;
} ;





			/* Network */



nk.Network = function Network() {} ;

nk.createNetwork = function createNetwork( options )
{
	var network = Object.create( nk.Network.prototype ) ;
	
	//if ( ! options || typeof options !== 'object' ) { throw new TypeError( '[network] .createNetwork(): arguments #0 should be an object of options' ) ; }
	//if ( ! Array.isArray( options.inputs ) ) { throw new TypeError( "[network] .createNetwork(): arguments #0 should have an 'inputs' property containing an array of string" ) ; }
	//if ( ! Array.isArray( options.outputs ) ) { throw new TypeError( "[network] .createNetwork(): arguments #0 should have an 'outputs' property containing an array of string" ) ; }
	
	network.stateId = 0 ;
	network.inputs = {} ;
	network.outputs = {} ;
	network.hiddenNeurons = [] ;
	
	//var i ;
	//for ( i = 0 ; i < options.inputs.length ; i ++ ) { network.inputs[ options.inputs[ i ] ] = null ; }
	//for ( i = 0 ; i < options.outputs.length ; i ++ ) { network.outputs[ options.outputs[ i ] ] = null ; }
	
	return network ;
} ;



nk.Network.prototype.addInput = function addInput( name , emitter )
{
	if ( ! name || typeof name !== 'string' ) { throw new TypeError( '[network] .addInput(): arguments #0 should be non-empty string' ) ; }
	if ( ! ( emitter instanceof nk.SignalEmitter ) ) { throw new TypeError( '[network] .addInput(): arguments #1 should be an instance of SignalEmitter' ) ; }
	if ( this.inputs[ name ] ) { throw new TypeError( "[network] .addInput(): the current input '" + name + "' is already defined" ) ; }
	if ( emitter.network ) { throw new Error( '[network] .addInput(): the emitter is already part of a network' ) ; }
	
	this.inputs[ name ] = emitter ;
	emitter.network = this ;
	this.stateId ++ ;
} ;



nk.Network.prototype.addOutput = function addOutput( name , neuron )
{
	if ( ! name || typeof name !== 'string' ) { throw new TypeError( '[network] .addOutput(): arguments #0 should be non-empty string' ) ; }
	if ( ! ( neuron instanceof nk.Neuron ) ) { throw new TypeError( '[network] .addOutput(): arguments #1 should be an instance of Neuron' ) ; }
	if ( this.outputs[ name ] ) { throw new TypeError( "[network] .addOutput(): the current output '" + name + "' is already defined" ) ; }
	if ( neuron.network ) { throw new Error( '[network] .addOutput(): the neuron is already part of a network' ) ; }
	
	this.outputs[ name ] = neuron ;
	neuron.network = this ;
	this.stateId ++ ;
} ;



nk.Network.prototype.addHiddenNeuron = function addHiddenNeuron( neuron )
{
	if ( ! ( neuron instanceof nk.Neuron ) ) { throw new TypeError( '[network] .addHidden(): arguments #0 should be an instance of Neuron' ) ; }
	if ( neuron.network ) { throw new Error( '[network] .addHiddenNeuron(): the neuron is already part of a network' ) ; }
	
	this.hiddenNeurons.push( neuron ) ;
	neuron.network = this ;
	this.stateId ++ ;
} ;



nk.Network.prototype.setInputSignals = function setInputSignals( inputs )
{
	if ( ! inputs || typeof inputs !== 'object' ) { throw new TypeError( '[network] .inputSignals(): arguments #0 should be an object' ) ; }
	
	var key , modified = false ;
	
	for ( key in inputs )
	{
		if ( key in this.inputs && this.inputs[ key ].signal !== inputs[ key ] )
		{
			this.inputs[ key ].signal = inputs[ key ] ;
			
			if ( ! modified )
			{
				modified = true ;
				this.stateId ++ ;
			}
			
			this.inputs[ key ].stateId = this.stateId ;
		}
	}
} ;



nk.Network.prototype.getOutputSignal = function getoutputSignal( name )
{
	// undefined or throw error?
	if ( ! ( name in this.outputs ) ) { return undefined ; }
	
	if ( this.outputs[ name ].stateId >= this.stateId ) { return this.outputs[ name ].signal ; }
	
	this.outputs[ name ].forwardSignal( true ) ;
	
	return this.outputs[ name ].signal ;
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
nk.transferFunctions.logistic = function( x ) { return 1 / ( 1 + Math.exp( - x ) ) ; } ;
// The inverse is actually the 'logit' function
nk.transferFunctions.logistic.inverse = function( x ) { return Math.log( x / ( 1 - x ) ) ; } ;



// Training:
// http://en.wikipedia.org/wiki/Perceptron#Example
// http://en.wikipedia.org/wiki/Backpropagation

