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



function Network( options ) {
	this.ready = false ;
	this.namedInputUnits = {} ;
	this.namedOutputUnits = {} ;
	this.inputUnits = [] ;	// input neurons/signal
	this.outputUnits = [] ;	// output neurons
	this.hiddenUnits = [] ;	// hidden neurons
	this.orderedUnits = [] ;	// ordered hiddenUnits + outputUnits
} ;



Network.prototype.addInput = function addInput( input ) {
	this.inputUnits.push( input ) ;
	
	if ( name ) {
		this.namedInputUnits[ name ] = input ;
	}
	
	this.ready = false ;
} ;



Network.prototype.addOutput = function addOutput( output , name ) {
	this.outputUnits.push( output ) ;
	
	if ( name ) {
		this.namedOutputUnits[ name ] = output ;
	}
	
	this.ready = false ;
} ;



Network.prototype.addHidden = function addHidden( unit ) {
	this.hiddenUnits.push( neuron ) ;
	this.ready = false ;
} ;



Network.prototype.setInputs = function setInputs( inputs ) {
	inputs.forEach( ( input , index ) => this.inputUnits[ index ].signal = input ) ;
} ;



Network.prototype.setNamedInput = function setNamedInput( namedInputs ) {
	var name ;
	
	for ( name in namedInputs ) {
		this.namedInputUnits[ name ].signal = namedInputs[ name ] ;
	}
} ;



Network.prototype.getOuputSignals = function setInputSignals() {
	return this.outputUnits.map( output => output.signal ) ;
} ;



Network.prototype.getNamedOuput = function getNamedInput() {
	var name , output = {} ;
	
	for ( name in this.namedOutputUnits ) {
		output[ name ] = this.namedOutputUnits[ name ].signal ;
	}
} ;



Network.prototype.computeNeuronOrder = function computeNeuronOrder() {
	var unit , lastSize ;

	this.orderedUnits = [] ;

	var determined = new Set( this.inputUnits ) ;
	var remaining = new Set( this.hiddenUnits.concat( this.outputUnits ) ) ;
	
	while ( remaining.size && remaining.size !== lastSize ) {
		lastSize = remaining.size ;
		
		for ( unit of remaining ) {
			if ( unit.synapses.every( synapse => determined.has( synapse.input ) ) ) {
				this.orderedNeurons.push( unit ) ;
				determined.add( unit ) ;
				remaining.delete( unit ) ;
			}
		}
	}
	
	this.ready = true ;
} ;



Network.prototype.feedForward = function feedForward() {
	this.orderedNeurons.forEach( neuron => neuron.forwardSignal() ) ;
} ;



/*
Network.prototype.backwardCorrection = function backwardCorrection( outputs ) {
	var i ;

	if ( ! this.ready ) { this.computeNeuronOrder() ; }

	for ( i = 0 ; i < this.orderedNeurons.length ; i ++ ) {
		this.orderedNeurons[ i ].backSignals = [] ;
	}

	this.setOutputBackSignals( outputs ) ;

	for ( i = this.orderedNeurons.length - 1 ; i >= 0 ; i -- ) {
		this.orderedNeurons[ i ].backwardSignal() ;
	}
} ;
*/

