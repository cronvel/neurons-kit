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
	// Mainland population
	this.population = options.population || [] ;
	this.populationSize = options.populationSize || 100 ;

	// Island population (array of Evolution instances)
	this.islands = options.islands || [] ;
	this.maxIslands = options.maxIslands || 0 ;
	this.mutationIslandChance = options.mutationIslandChance || 0.05 ;	// New Island chance on mutation
	this.crossOverIslandChance = options.crossOverIslandChance || 0.05 ;	// New Island chance on cross-over

	this.createNetworkFn = options.createNetworkFn ;

	this.trialFn = options.trialFn ;
	this.trialCount =
		options.trialCount !== undefined ? options.trialCount :
		this.trialFn ? 1 :
		0 ;
	this.trialVersusFn = options.trialVersusFn ;
	this.trialVersusCount =
		options.trialVersusCount !== undefined ? options.trialVersusCount :
		this.trialVersusFn ? 1 :
		0 ;
	this.versus =
		options.versus !== undefined ? options.versus :
		this.trialVersusFn ? 1 :
		0 ;

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
	
	this.isIsland = !! options.isIsland ;
	this.islandGeneration = options.islandGeneration || 0 ;	// The local generation for island
	this.islandCounter = options.islandCounter || 0 ;
	this.islandTimeout = options.islandTimeout || 10 ;	// Number of generation before merging the island back to mainland
	this.id = options.id || ( this.isIsland ? 'island' : 'mainland' ) ;	
	this.parent = options.parent || null ;	// for island, it's the parent mainland
}

module.exports = Evolution ;



Evolution.prototype.createIsland = function( id = null ) {
	return new Evolution( {
		isIsland: true ,
		parent: this ,
		id: id || 'island #' + ( this.islandCounter ++ ) ,
		populationSize: this.populationSize ,
		createNetworkFn: this.createNetworkFn ,
		trialFn: this.trialFn ,
		trialCount: this.trialCount ,
		trialVersusFn: this.trialVersusFn ,
		trialVersusCount: this.trialVersusCount ,
		versus: this.versus ,
		selectionRate: this.selectionRate ,
		eliteRate: this.eliteRate ,
		immunity: this.immunity ,
		removeImmunity: this.removeImmunity ,
		mutation: this.mutation ,
		generation: this.generation ,
		islandTimeout: this.islandTimeout
	} ) ;
} ;



Evolution.prototype.savePopulation = function( filePath ) {
	var data = {
		id: this.id ,
		generation: this.generation ,
		population: this.population.map( n => n.export() ) ,
		islandCounter: this.islandCounter ,
		islandTimeout: this.islandTimeout ,
		islands: this.islands.map( island => ( {
			id: island.id ,
			islandGeneration: island.islandGeneration ,
			population: island.population.map( n => n.export() ) ,
			populationSize: island.populationSize
		} ) )
	} ;

	return fs.promises.writeFile( filePath , JSON.stringify( data ) ) ;
} ;



Evolution.prototype.loadPopulation = async function( filePath ) {
	var data = JSON.parse( await fs.promises.readFile( filePath , 'utf8' ) ) ;
	if ( ! Array.isArray( data.population ) ) { throw new Error( 'Bad file: population is not an array' ) ; }
	this.id = data.id || this.id ;
	this.generation = data.generation || this.id ;
	this.islandCounter = data.islandCounter || this.islandCounter ;
	this.islandTimeout = data.islandTimeout || this.islandTimeout ;
	this.population.push( ... data.population.map( e => Network.import( e ) ) ) ;

	if ( data.islands ) {
		if ( ! Array.isArray( data.islands ) ) { throw new Error( 'Bad file: islands is not an array' ) ; }
		data.islands.forEach( islandData => {
			if ( ! Array.isArray( islandData.population ) ) { throw new Error( 'Bad file: island population is not an array' ) ; }

			var island = this.createIsland( islandData.id ) ;
			island.islandGeneration = islandData.islandGeneration || 0 ;
			island.population.push( ... islandData.population.map( e => Network.import( e ) ) ) ;
			island.populationSize = islandData.populationSize || island.population.length ;
			this.islands.push( island ) ;
		} ) ;
	}
} ;



Evolution.prototype.init = async function() {
	while ( this.population.length < this.populationSize ) {
		this.population.push( await this.createNetworkFn() ) ;
	}

	for ( let network of this.population ) {
		if ( ! network.metadata.generation ) { network.metadata.generation = this.generation ; }
		if ( ! network.metadata.land ) { network.metadata.land = this.id ; }
	}
} ;



Evolution.prototype.runNextGeneration = async function() {
	var count , network , island ;


	// Init

	this.generation ++ ;
	if ( this.isIsland ) { this.islandGeneration ++ ; }

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


	// Run islands

	if ( ! this.isIsland ) {
		for ( island of this.islands ) {
			await island.runNextGeneration() ;
		}
	}


	// Create the next generation

	this.produceNextGeneration() ;
} ;



Evolution.prototype.produceNextGeneration = async function( noCrossOver = false ) {

	// Selection

	// Sort from the best to the worst, set only select the elite
	var newNetwork , island , newIsland , eliteIndex = 0 ,
		selectionCount = Math.ceil( this.selectionRate * this.population.length ) ,
		eliteCount = Math.ceil( this.eliteRate * this.population.length ) ,
		maxPopulation = this.populationSize + this.islands.length ;
	

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


	// Each island send is best emissary back to mainland

	if ( ! this.isIsland ) {
		this.islands = this.islands.filter( island_ => {
			if ( island_.islandGeneration <= this.islandTimeout ) { return true ; }
			
			// If the island reached the timeout, its population is merged back into the mainland
			log.hdebug( "Island '%s' is merged back into mainland" , island_.id ) ;
			maxPopulation += island_.population.length ;
			this.population.push( ... island_.population ) ;
			return false ;
		} ) ;
		
		for ( island of this.islands ) {
			if ( ! island.population[ 0 ] ) { continue ; }
			newNetwork = island.population[ 0 ].clone() ;
			newNetwork.metadata.generation = this.generation ;
			newNetwork.metadata.land = island.id ;
			this.population.push( newNetwork ) ;
		}
	}


	// Cloning + Mutation

	while ( this.population.length < maxPopulation ) {
		newNetwork = this.population[ eliteIndex ].clone() ;
		newNetwork.mutate( this.mutation ) ;
		newNetwork.metadata.generation = this.generation ;

		if ( ! this.isIsland && this.islands.length < this.maxIslands && Math.random() < this.mutationIslandChance ) {
			newIsland = this.createIsland() ;
			log.hdebug( "Create a new Island: '%s'" , newIsland.id ) ;
			newNetwork.metadata.land = newIsland.id ;
			newIsland.population.push( newNetwork ) ;
			
			// Populate the island, but no cross-over allowed here
			newIsland.produceNextGeneration( true ) ;

			this.islands.push( newIsland ) ;
		}
		else {
			newNetwork.metadata.land = this.id ;
			this.population.push( newNetwork ) ;
		}

		eliteIndex = ( eliteIndex + 1 ) % eliteCount ;
	}
} ;

