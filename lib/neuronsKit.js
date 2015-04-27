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

nk.createSignalEmitter = function createSignalEmitter( signal )
{
	var emitter = Object.create( nk.SignalEmitter.prototype ) ;
	
	emitter.signal = signal !== undefined ? signal : 0 ;
	
	return emitter ;
} ;



nk.SignalEmitter.prototype.connectTo = function connectTo( neuron , weight )
{
	if ( ! ( neuron instanceof nk.Neuron ) ) { throw new TypeError( '[signal] .connectTo(): arguments #0 should be an instance of Neuron' ) ; }
	
	neuron.synapses.push( nk.createSynapse( this , weight ) ) ;
} ;





			/* Neuron */



nk.Neuron = function Neuron() {} ;
nk.Neuron.prototype = Object.create( nk.SignalEmitter.prototype ) ;
nk.Neuron.prototype.constructor = nk.Neuron ;



nk.createNeuron = function createNeuron( options )
{
	var neuron = Object.create( nk.Neuron.prototype ) ;
	
	if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	neuron.transfer = typeof options.transfer === 'string' && nk.transferFunctions[ options.transfer ] ?
		nk.transferFunctions[ options.transfer ] :
		nk.transferFunctions.step ;
	
	neuron.threshold = options.threshold !== undefined ? options.threshold : 0.5 ;
	
	neuron.synapses = [] ;
	neuron.signal = options.signal !== undefined ? options.signal : 0 ;
	
	return neuron ;
} ;



nk.Neuron.prototype.update = function update()
{
	var i , sum = - this.threshold ;
	
	console.log( sum ) ;
	
	for ( i = 0 ; i < this.synapses.length ; i ++ )
	{
		sum += this.synapses[ i ].emitter.signal * this.synapses[ i ].weight ;
		console.log( this.synapses[ i ] ) ;
		console.log( sum ) ;
	}
	
	this.signal = this.transfer( sum ) ;
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





			/* Transfer functions */



nk.transferFunctions = {} ;



nk.transferFunctions.step = nk.transferFunctions.heavyside = function step( x )
{
	return x >= 0 ? 1 : 0 ;
} ;



nk.transferFunctions.linear = function linear( x )
{
	return x ;
} ;



nk.transferFunctions.rectifier = function rectifier( x )
{
	return Math.max( 0 , x ) ;
} ;



nk.transferFunctions.leakyRectifier = function leakyRectifier( x )
{
	return x >= 0 ? x : 0.01 * x ;
} ;



nk.transferFunctions.softPlusRectifier = function softPlusRectifier( x )
{
	return Math.log( 1 + Math.exp( x ) ) ;
} ;



// Sigmoid logistic
nk.transferFunctions.logistic = function logistic( x )
{
	return 1 / ( 1 + Math.exp( - x ) ) ;
} ;



// Training:
// http://en.wikipedia.org/wiki/Perceptron#Example
// http://en.wikipedia.org/wiki/Backpropagation

