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



const activationFunctions = require( './activationFunctions.js' ) ;
const Logfella = require( 'logfella' ) ;
const log = Logfella.global.use( 'neurons-kit' ) ;



const DEFAULT_ID_GENERATOR = () => { throw new Error( "DANG! DEPRECATED!" ) ; } ;
const DEFAULT_DELTA_FORMULA = x => Math.atanh( 0.999999 * x ) / Math.SQRT2 ;



/*
	Options:
		* count: number of allowed mutations (default to 1)
		* perUnitCount: extra mutations per hidden unit count (default to 0)
		* newConnectionChance: chance to create a new connection
		* removeConnectionChance: chance to remove a connection
		* newUnitChance: chance to create a new unit
		* removeUnitChance: chance to remove a unit
		* mutateActivationChance: chance to mutate the activation function
		* biasDelta: the bias mutation range
		* weightDelta: the weight mutation range
		* newConnectionWeight: weight range for new connections
		* newUnitBias: bias range for new connections
		* removeConnectionThreshold: the absolute weight should be below or equal to this value for this connection
			to be eligible for removal
		* removeUnitThreshold: the sum of absolute weight should be below or equal to this value for this unit
			to be eligible for removal
		* abortedRemoveCutRate: if a remove connection or unit failed because of threshold, all bias/weight will be cut
		  by this rate value
		* activations: Array of allowed activation function
		* random: Function that return a random number from 0 (included) to 1 (excluded)
		* deltaFormula: Function, random 0-1 value as input, return a distribution used for delta adjustements
*/
function Mutation( options = {} ) {
	this.count = options.count !== undefined ? options.count : 1 ;
	this.perUnitCount = options.perUnitCount || 0 ;
	this.newConnectionChance = options.newConnectionChance || 0 ;
	this.removeConnectionChance = options.removeConnectionChance || 0 ;
	this.newUnitChance = options.newUnitChance || 0 ;
	this.removeUnitChance = options.removeUnitChance || 0 ;
	this.mutateActivationChance = options.mutateActivationChance || 0 ;
	this.biasDelta = options.biasDelta !== undefined ? options.biasDelta : 0.5 ;
	this.weightDelta = options.weightDelta !== undefined ? options.weightDelta : 0.5 ;
	this.momentumCount = options.momentumCount || 0 ;
	this.momentumChance = options.momentumChance || 0 ;
	this.momentumInBetweenChance = options.momentumInBetweenChance || 0 ;
	this.newConnectionWeight = options.newConnectionWeight !== undefined ? options.newConnectionWeight : 0.1 ;
	this.newUnitBias = options.newUnitBias !== undefined ? options.newUnitBias : 0.1 ;
	this.removeConnectionThreshold = options.removeConnectionThreshold !== undefined ? options.removeConnectionThreshold : 0.25 ;
	this.removeUnitThreshold = options.removeUnitThreshold !== undefined ? options.removeUnitThreshold : 0.4 ;

	// Not coded ATM
	this.abortedRemoveCutRate = options.abortedRemoveCutRate !== undefined ? options.abortedRemoveCutRate : 0.25 ;

	this.activations = options.activations || [] ;
	this.newId = options.newId || DEFAULT_ID_GENERATOR ;
	this.random = options.random || Math.random ;
	this.deltaFormula = options.deltaFormula || DEFAULT_DELTA_FORMULA ;
}

module.exports = Mutation ;



Mutation.prototype.deltaRandom = function() {
	return this.deltaFormula( 2 * this.random() - 1 ) ;
} ;



Mutation.prototype.mutateBias = function( bias ) { return this.biasDelta * this.deltaRandom() ; } ;
Mutation.prototype.mutateWeight = function( weight ) { return this.weightDelta * this.deltaRandom() ; } ;
Mutation.prototype.newBias = function() { return this.newUnitBias * this.deltaRandom() ; } ;
Mutation.prototype.newWeight = function() { return this.newConnectionWeight * this.deltaRandom() ; } ;

