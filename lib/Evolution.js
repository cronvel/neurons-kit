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



const fs = require( 'fs' ) ;
const arrayKit = require( 'array-kit' ) ;

const Network = require( './Network.js' ) ;
const Mutation = require( './Mutation.js' ) ;

const Logfella = require( 'logfella' ) ;
const log = Logfella.global.use( 'neurons-kit' ) ;



/*
	Sort of genetic algorithm without gene.
	Inspired by NEAT:
	http://nn.cs.utexas.edu/downloads/papers/stanley.ec02.pdf

	So this algorithm should work this way:
		* Should start with a minimal network
			* Only one connection between the input and output layer
			* OR one hidden neuron connected (upstream) to one input and connected (downstream) to one output
		* Concurrently trial all networks and give them a score
		* Select the best
		* Mutation: among the best, clone some of them and mutate them:
			* Change randomly some synapse weights and bias
			* Randomly remove a connection (synapse)
				* Better chance to remove it if the synapse is rarely used: if its excitation (input x weight)
				  is closed to zero most of time
			* Randomly remove a neuron
				* Better chance if its output signal is most of time closed to zero, even more chance there
				  isn't any downstream path
			* Randomly add a neuron with a unique ID (probably an auto-increment)
				* The unique ID is used for crossing over networks
			* Randomly add a connection (synapse) that doesn't violate feed-forward processing
				* Better chance if two neurons activate at the same time, it is said that they should connect
		* Crossover/breed networks: among the best, create networks that are the sum/average of 2 networks
			* Create a topology that have all neurons and connections, it's easy since all neurons have an ID,
			  and a connection can be expressed as a unique from-to combination
			* When both network have the same neuron (e.g.: a neuron with the same ID), the bias is set randomly between both value
			* When both network have the same connection, the weight of the connection is set randomly between both value
			* There is also a chance that all weight+bias of a neuron comes from only one parent, to enforce a kind of
			  specialization of each neuron?
			* Crossed networks should be preserved, this kind of innovation is not effective immediately,
			  perhaps create “Islands” for them
		* “Islands” are isolated ecosystem, only networks of the same island are put in concurrency
			* “Islands” are randomly reunited, the chance for a merge is greater when for every unmerged generation
*/

/*
	Mandatory options:
		* createNetworkFn: a function to create a new network
		* trialFn: the function that test an individual, should return a score (fitness)
		* trialVersusFn: a function that test an individual against one or more other

	Other options:
		* population: the starting population, if not set or not enough individual, at some point it will use createNetworkFn()
		  to add more
		* populationSize: the number of individuals we want in the population (default: 100)
		* trialCount: default to 1, if set to a positive integer, the number of time the trial should be done per round (epoch/gen)
		* trialVersusCount: default to 1, if set to a positive integer, the number of time the trial-versus should be done
		  per round (epoch/gen), it is useful when versus is set, to make multiple matchup between different individuals
		  (so the second best could not disappear because it loses vs the best)
		* versus: if set to a positive integer, the number of individuals needed for trialVersusFn to compete versus each other,
		  e.g. for a two players game, set versus to 1
		* selectionRate: float between 0 and 1, how many of the current generation survive to the next (default 0.2)
		* mutation: an instance of Mutation
		* generation: default to 0, used when resuming
*/
function Evolution( options = {} ) {
	this.population = options.population || [] ;
	this.populationSize = options.populationSize || 100 ;
	this.createNetworkFn = options.createNetworkFn ;

	this.trialFn = options.trialFn ;
	this.trialCount = options.trialCount || 1 ;
	this.trialVersusFn = options.trialVersusFn ;
	this.trialVersusCount = options.trialVersusCount || 1 ;
	this.versus = options.versus || 0 ;

	// Selection: survive to the next gen, elite: allowed to clone+mutate and/or cross-over
	// Having a broader selectionRate than eliteRate is useful if there is some kind of randomness in the trial,
	// so an individual is allowed to survive until it has better luck.
	// In this case, the eliteRate should be narrow.
	this.selectionRate = options.selectionRate || 0.2 ;
	this.eliteRate = Math.min( this.selectionRate , options.eliteRate || 0.2 ) ;

	// /!\ Immunity code was badly written (was a fast-hack), should be refactored ASAP
	this.immunity = options.immunity || 0 ;	// Give immunity to the best individual
	this.removeImmunity = !! options.removeImmunity ;	// Remove immunity
	
	this.mutation = ( options.mutation instanceof Mutation ) ? options.mutation : new Mutation( options.mutation ) ;

	this.generation = options.generation || 0 ;
}

module.exports = Evolution ;



Evolution.prototype.savePopulation = function( filePath ) {
	var data = {
		generation: this.generation ,
		population: this.population.map( n => n.export() )
	} ;

	return fs.promises.writeFile( filePath , JSON.stringify( data ) ) ;
} ;



Evolution.prototype.loadPopulation = async function( filePath ) {
	var data = JSON.parse( await fs.promises.readFile( filePath , 'utf8' ) ) ;
	if ( ! Array.isArray( data.population ) ) { throw new Error( 'Bad file: not an array' ) ; }
	this.generation = data.generation || 0 ;
	this.population.push( ... data.population.map( e => Network.import( e ) ) ) ;
} ;



Evolution.prototype.init = async function() {
	while ( this.population.length < this.populationSize ) {
		this.population.push( await this.createNetworkFn() ) ;
	}

	for ( let network of this.population ) {
		if ( ! network.metadata.generation ) { network.metadata.generation = this.generation ; }
	}
} ;



Evolution.prototype.runNextGeneration = async function() {
	var count , network , selectionCount , eliteCount , eliteIndex , newNetwork ;


	// Init

	this.generation ++ ;

	for ( network of this.population ) {
		network.metadata.score = 0 ;	// a.k.a. fitness
	}


	// Do all trials to get current score/fitness

	if ( this.trialFn ) {
		count = this.trialCount ;
		while ( count -- ) {
			for ( network of this.population ) {
				network.metadata.score += await this.trialFn( network ) ;
			}
		}
	}

	if ( this.trialVersusFn ) {
		// Prepare matchup
		count = this.trialVersusCount ;
		let roundOffset = 0 ;
		let roundInc = 1 + Math.floor( ( this.population.length - 2 ) * Math.random() ) ;
		let ranges = arrayKit.range( this.population.length ) ;
		let scores = [] ;
		let versusNetworks ;

		let versusOffsets = arrayKit.sample( ranges , this.versus + 1 ) ;

		// !! Caution: each versus networks should be in the same number of trials, or the score would be biased !!

		while ( count -- ) {
			for ( let i = 0 ; i < this.population.length ; i ++ ) {
				versusNetworks = versusOffsets.map( offset => this.population[ ( i + offset + roundOffset ) % this.population.length ] ) ;
				scores = await this.trialVersusFn( versusNetworks ) ;
				scores.forEach( ( score , j ) => versusNetworks[ j ].metadata.score += score ) ;
			}

			roundOffset += roundInc ;
		}
	}


	// Selection

	// Sort from the best to the worst, set only select the elite
	eliteIndex = 0 ;
	selectionCount = this.selectionRate * this.population.length ;
	eliteCount = this.eliteRate * this.population.length ;

	this.population.sort( ( a , b ) =>
		!! b.metadata.immunity === !! a.metadata.immunity ? b.metadata.score - a.metadata.score :
		b.metadata.immunity ? 1 : -1
	) ;

	this.population.length = selectionCount ;

	if ( this.immunity ) {
		this.population[ 0 ].metadata.immunity = true ;
		this.immunity -- ;
	}
	else if ( this.removeImmunity ) {
		this.population[ 0 ].metadata.immunity = false ;
	}


	// Cloning + Mutation

	while ( this.population.length < this.populationSize ) {
		network = this.population[ eliteIndex ] ;

		newNetwork = network.clone() ;
		newNetwork.mutate( this.mutation ) ;
		newNetwork.metadata.generation = this.generation ;
		this.population.push( newNetwork ) ;

		eliteIndex = ( eliteIndex + 1 ) % eliteCount ;
	}
} ;

