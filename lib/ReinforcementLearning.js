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



const Network = require( './Network.js' ) ;
const ReinforcementSample = require( './ReinforcementSample.js' ) ;

const Logfella = require( 'logfella' ) ;
const log = Logfella.global.use( 'neurons-kit' ) ;



/*
	Mandatory params:
		* network: the network to train
	Params:
		* gamma: between 0 and 1, lower for short-term, higher for long-term
		* maxSamples: maximum samples to store
*/
function ReinforcementLearning( network , params = {} ) {
	if ( ! network || ! ( network instanceof Network ) ) {
		throw new Error( "ReinforcementLearning constructor requires a Network instance as argument #0" ) ;
	}

	this.network = network ;

	this.gamma = params.gamma ?? 0.8 ;
	this.maxSamples = params.maxSamples || 50 ;


	this.samples = [] ;
	

	





	
	this.trialFn = params.trialFn ;
	this.trialCount =
		params.trialCount !== undefined ? params.trialCount :
		this.trialFn ? 1 :
		0 ;
	this.trialVersusFn = params.trialVersusFn ;
	this.trialVersusCount =
		params.trialVersusCount !== undefined ? params.trialVersusCount :
		this.trialVersusFn ? 1 :
		0 ;
	this.versus =
		params.versus !== undefined ? params.versus :
		this.trialVersusFn ? 1 :
		0 ;
	this.versusMode = params.versusMode ;
	this.orderedVersus = !! params.orderedVersus ;
	this.tourneyPoolSize = params.tourneyPoolSize || 16 ;
	this.tourneyQualificationRate = params.tourneyQualificationRate || 0.5 ;

	// Score penalty for each hidden unit
	this.penaltyPerHiddenUnit = params.penaltyPerHiddenUnit || 0 ;

	// Selection: survive to the next gen, elite: allowed to clone+mutate and/or cross-over
	// Having a broader selectionRate than eliteRate is useful if there is some kind of randomness in the trial,
	// so an individual is allowed to survive until it has better luck.
	// In this case, the eliteRate should be narrow.
	this.selectionRate = params.selectionRate || 0.2 ;
	this.eliteRate = Math.min( this.selectionRate , params.eliteRate || 0.2 ) ;
	this.crossOverChance = params.crossOverChance || 0 ;

	// The compatibility should be greater than or equals to this value, for cross-over
	this.crossOverCompatibility = params.crossOverCompatibility || 0 ;

	// Store names of unit connecting 2 units, avoiding distinct unit proliferation, improving cross-over, and so on...
	this.connectingUnitIds = {} ;

	// How many generation the best/elite networks are preserved (automatically selected).
	// Keep it small because it would prevent new blood, especilly since immunity are created at each generation.
	// Goode values are 1 for elite, 3-5 for the best.
	this.bestImmunity = params.bestImmunity || 0 ;
	this.eliteImmunity = params.eliteImmunity || 0 ;

	this.mutation = ( params.mutation instanceof Mutation ) ? params.mutation : new Mutation( params.mutation ) ;

	this.generation = params.generation || 0 ;
	this.lastRoundTime = 0 ;

	// Parameters for the network runner
	this.networkRunner = params.networkRunner && typeof params.networkRunner === 'object' ? params.networkRunner : {} ;

	this.isIsland = !! params.isIsland ;
	this.islandSize = params.islandSize || this.populationSize * 0.5 ;
	this.islandGeneration = params.islandGeneration || 0 ;	// The local generation for island
	this.islandTimeout = params.islandTimeout || 10 ;	// Number of generation before merging the island back to mainland
	this.id = params.id || ( this.isIsland ? 'island' : 'mainland' ) ;
	this.parent = params.parent || null ;	// for island, it's the parent mainland

	this.unitIdCounter = params.unitIdCounter || 0 ;	// For generating unit ID
	this.networkIdCounter = params.networkIdCounter || 0 ;	// For generating network ID
	this.islandIdCounter = params.islandIdCounter || 0 ;	// For generating island ID

	this.newUnitId = this.newUnitId.bind( this ) ;
}

module.exports = ReinforcementLearning ;



ReinforcementLearning.prototype.addSample = function() {
	var sample = new ReinforcementSample( Array.from( inputs ) , policy , expectedReward ) ;
	this.samples.push( sample ) ;
} ;



ReinforcementLearning.prototype.setLastReward = function( instantReward ) {
	if ( ! this.samples.length ) { return ; }
	this.samples[ this.samples.length - 1 ].instantReward = instantReward ;
} ;

