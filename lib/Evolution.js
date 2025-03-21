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
	/!\ NOTICE: “islands” seems less effective than speciation, I need to implement that!

	Sort of genetic algorithm without gene.
	Inspired by NEAT:
	http://nn.cs.utexas.edu/downloads/papers/stanley.ec02.pdf

	So this algorithm should work this way:
		* Should start with a minimal network
			* Only one connection between the input and output layer
		* Concurrently trial all networks and give them a score
		* Select the best
		* Mutation: among the best, clone some of them and mutate them:
			* Change randomly some synapse weights and bias
			* Randomly remove a connection (synapse)
				* Better chance to remove it if the synapse is rarely used: if its excitation (input x weight)
				  is closed to zero most of time
			* Randomly remove a neuron
				* Better chance if its output signal is most of time closed to zero, even more chance if there
				  isn't any downstream path
			* Randomly add a neuron with a unique ID (probably an auto-increment)
				* The unique ID is used for crossing over networks
			* Randomly add a connection (synapse) that doesn't violate feed-forward processing
				* Better chance if two neurons activate at the same time, it is said that they should connect
		* Crossover/mating networks: among the best, create networks that are the sum/average of 2 networks
			* Create a topology that have all neurons and connections, it's easy since all neurons have an ID,
			  and a connection can be expressed as a unique from-to combination
			* When both network have the same neuron (e.g.: a neuron with the same ID), the bias is set randomly between both value
			* When both network have the same connection, the weight of the connection is set randomly between both value
			* There is also a chance that all weight+bias of a neuron comes from only one parent, to enforce a kind of
			  specialization of each neuron?
			* Crossed networks should be preserved, this kind of innovation is not effective immediately,
			  perhaps create “Islands” for them
		* “Islands” are isolated ecosystem, only networks of the same island are put in concurrency
*/

/*
	Mandatory params:
		* createNetworkFn: a function to create a new network
		* trialFn( network ): the function that test an individual, should return a score (fitness)
			* network: the network to test
		* trialVersusFn( networks ): a function that test an individual against one or more other, arguments:
			* networks: array of networks that compete versus each other, for some game, the order matters, e.g. the first network is
			  the first to play
	Other params:
		* population: the starting population, if not set or not enough individual, at some point it will use createNetworkFn()
		  to add more
		* populationSize: the number of individuals we want in the population (default: 100)
		* trialCount: default to 1, if set to a positive integer, the number of time the trial should be done per round (epoch/gen)
		* trialVersusCount: default to 1, if set to a positive integer, the number of time the trial-versus should be done
		  per round (epoch/gen), it is useful when versus is set, to make multiple matchup between different individuals
		  (so the second best could not disappear because it loses vs the best)
		* versus: if set to a positive integer, the number of individuals needed for trialVersusFn to compete versus each other,
		  e.g. for a two players game, set versus to 1
		* versusMode: string (default: "random"), one of:
			* random: each individual compete versus random individuals
			* all: each individual compete versus each other individual
			* tourney: compete in a tourney, with multiple phase where individuals are in pools, faster than "all", and should be as good
		* orderedVersus: if not ordered, each individual competes once versus each other,
		  else (if not "random") it competes twice because the order matters (e.g.: it's a turn-based 1 vs 1 game, starting gives an advantage)
		* selectionRate: float between 0 and 1, how many of the current generation survive to the next (default 0.2)
		* mutation: an instance of Mutation
		* penaltyPerHiddenUnit: if set, for each hidden unit the score of the network is decreased by this value.
		* generation: default to 0, used when resuming
*/
function Evolution( params = {} ) {
	// Mainland population
	this.population = params.population || [] ;
	this.populationSize = params.populationSize || 100 ;

	// Island population (array of Evolution instances)
	this.islands = params.islands || [] ;
	this.startingIslands = params.startingIslands || 0 ;
	this.maxIslands = params.maxIslands || 0 ;
	this.mutationIslandChance = params.mutationIslandChance || 0.05 ;	// New Island chance on mutation
	this.crossOverIslandChance = params.crossOverIslandChance || 0.2 ;	// New Island chance on cross-over

	this.createNetworkFn = params.createNetworkFn ;

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

module.exports = Evolution ;



Evolution.prototype.newUnitId = function( code , fromUnit , toUnit ) {
	var key , id ;

	// Unit ID should be unique even across islands and mainland, so we use the parent method, if any...
	if ( this.parent ) { return this.parent.newUnitId( code , fromUnit , toUnit ) ; }

	key = fromUnit.id + '|' + toUnit.id ;
	if ( this.connectingUnitIds[ key ] ) {
		return this.connectingUnitIds[ key ] ;
	}

	id = ( code ? code + ':' : '' ) + ( this.unitIdCounter ++ ) ;
	this.connectingUnitIds[ key ] = id ;

	return id ;
} ;



Evolution.prototype.createIsland = function( id = null ) {
	return new Evolution( Object.assign( {} , this , {
		isIsland: true ,
		parent: this ,
		id: id || 'island #' + ( this.islandIdCounter ++ ) ,
		population: null ,
		populationSize: Math.round( this.islandSize * ( 0.2 + Math.random() ) ) ,
		islands: null ,
		islandGeneration: 0 ,
		islandTimeout: Math.round( this.islandTimeout * ( 0.1 + Math.random() ) )
	} ) ) ;
} ;



Evolution.prototype.savePopulation = function( filePath ) {
	var data = {
		id: this.id ,
		generation: this.generation ,
		population: this.population.map( n => n.export() ) ,
		connectingUnitIds: this.connectingUnitIds ,
		unitIdCounter: this.unitIdCounter ,
		networkIdCounter: this.networkIdCounter ,
		islandIdCounter: this.islandIdCounter ,

		// Should not be saved, should be modified by the config:
		//islandTimeout: this.islandTimeout ,

		islands: this.islands.map( island => ( {
			id: island.id ,
			islandTimeout: island.islandTimeout ,
			islandGeneration: island.islandGeneration ,
			networkIdCounter: island.networkIdCounter ,
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
	this.connectingUnitIds = data.connectingUnitIds || this.connectingUnitIds ,
	this.unitIdCounter = data.unitIdCounter || this.unitIdCounter ;
	this.networkIdCounter = data.networkIdCounter || this.networkIdCounter ;
	this.islandIdCounter = data.islandIdCounter || this.islandIdCounter ;

	// Should not be loaded, should be modified by the config:
	//this.islandTimeout = data.islandTimeout || this.islandTimeout ;

	this.population.push( ... data.population.map( e => Network.import( e ) ) ) ;

	if ( data.islands ) {
		if ( ! Array.isArray( data.islands ) ) { throw new Error( 'Bad file: islands is not an array' ) ; }
		data.islands.forEach( islandData => {
			if ( ! Array.isArray( islandData.population ) ) { throw new Error( 'Bad file: island population is not an array' ) ; }

			var island = this.createIsland( islandData.id ) ;
			island.islandTimeout = islandData.islandTimeout || this.islandTimeout ;
			island.islandGeneration = islandData.islandGeneration || 0 ;
			island.networkIdCounter = islandData.networkIdCounter || 0 ;

			island.population.push( ... islandData.population.map( networkData => {
				var network ;

				try {
					network = Network.import( networkData ) ;
				}
				catch ( error ) {
					log.error( "%E\nNetwork data: %[5l500000]Y" , error , networkData ) ;
					throw error ;
				}

				return network ;
			} ) ) ;

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
		if ( ! network.metadata.id ) {
			network.metadata.id = network.metadata.land + ':' + network.metadata.generation + ':' + ( this.networkIdCounter ++ ) ;
		}
	}

	if ( ! this.isIsland ) {
		while ( this.islands.length < this.startingIslands ) {
			let island = this.createIsland() ;
			await island.init() ;
			this.islands.push( island ) ;
		}
	}
} ;



Evolution.prototype.runNextGeneration = async function() {

	// Init

	var startTime = Date.now() ;
	this.generation ++ ;
	if ( this.isIsland ) { this.islandGeneration ++ ; }

	for ( let network of this.population ) {
		// Score, a.k.a. fitness
		network.metadata.score = 0 ;
		network.metadata.penalty = network.hiddenUnits.length * this.penaltyPerHiddenUnit ;
		network.metadata.trials = 0 ;
		network.metadata.trialData = null ;
	}


	// Do all trials to get current score/fitness

	if ( this.trialFn && this.trialCount ) {
		await this.trial() ;
	}

	if ( this.trialVersusFn && this.versus ) {
		if ( this.versus > 1 ) {
			await this.trialVersusRandom() ;
		}
		else {
			switch ( this.versusMode ) {
				case 'all' :
					await this.trialVersusAll() ;
					break ;
				case 'tourney' :
					await this.trialVersusTourney() ;
					break ;
				case 'random' :
				default :
					await this.trialVersusRandom() ;
					break ;
			}
		}
	}


	// Run islands

	if ( ! this.isIsland ) {
		for ( let island of this.islands ) {
			await island.runNextGeneration() ;
		}
	}


	// Create the next generation

	this.produceNextGeneration() ;
	this.lastRoundTime = Date.now() - startTime ;
} ;



// Normal trial
Evolution.prototype.trial = async function() {
	var count = this.trialCount ;

	while ( count -- ) {
		for ( let network of this.population ) {
			network.metadata.score += await this.trialFn( network , this.networkRunner ) - network.metadata.penalty ;
			network.metadata.trials ++ ;
		}
	}
} ;



// Individual compete versus random individuals
Evolution.prototype.trialVersusRandom = async function() {
	// Prepare matchup
	var roundOffset = 0 ,
		count = this.trialVersusCount ,
		roundInc = 1 + Math.floor( ( this.population.length - 2 ) * Math.random() ) ,
		ranges = arrayKit.range( this.population.length ) ,
		versusOffsets = arrayKit.sample( ranges , this.versus + 1 ) ;

	// !! Caution: each versus networks should be in the same number of trials, or the score would be biased !!

	while ( count -- ) {
		for ( let i = 0 ; i < this.population.length ; i ++ ) {
			let versusNetworks = versusOffsets.map( offset => this.population[ ( i + offset + roundOffset ) % this.population.length ] ) ;
			let scores = await this.trialVersusFn( versusNetworks , this.networkRunner ) ;
			scores.forEach( ( score , j ) => {
				versusNetworks[ j ].metadata.score += score - versusNetworks[ j ].metadata.penalty ;
				versusNetworks[ j ].metadata.trials ++ ;
			} ) ;
		}

		roundOffset += roundInc ;
	}
} ;



// Individual compete versus all other individuals of the mainland/island.
// Only support 1 vs 1 ATM.
Evolution.prototype.trialVersusAll = async function( pool = this.population ) {
	// Prepare matchup

	for ( let i = 1 ; i < pool.length ; i ++ ) {
		let network1 = pool[ i ] ;

		for ( let j = 0 ; j < i ; j ++ ) {
			let network2 = pool[ j ] ;
			let scores = await this.trialVersusFn( [ network1 , network2 ] , this.networkRunner ) ;

			network1.metadata.score += scores[ 0 ] - network1.metadata.penalty ;
			network1.metadata.trials ++ ;

			network2.metadata.score += scores[ 1 ] - network2.metadata.penalty ;
			network2.metadata.trials ++ ;

			if ( this.orderedVersus ) {
				// The order matters, so we immediately set up a rematch with switching sides
				scores = await this.trialVersusFn( [ network2 , network1 ] , this.networkRunner ) ;

				network2.metadata.score += scores[ 0 ] - network2.metadata.penalty ;
				network2.metadata.trials ++ ;

				network1.metadata.score += scores[ 1 ] - network1.metadata.penalty ;
				network1.metadata.trials ++ ;
			}
		}
	}
} ;



// Individual compete in a tourney with multiple phases, splitted in pools, eliminating individuals low in the pool's rank.
// Should mostly produce the same result than .trialVersusAll(), but  should be way faster, since more and more individuals
// are eleminated between phases.
// Only support 1 vs 1 ATM.
Evolution.prototype.trialVersusTourney = async function() {
	var poolCount ,
		phase = 0 ,
		nextPhaseStartingScore = 0 ,
		remainingPopulation = Array.from( this.population ) ;

	do {
		// Number of pool, we want pool to have AT LEAST tourneyPoolSize individuals, so we round down
		poolCount = Math.max( 1 , Math.floor( remainingPopulation.length / this.tourneyPoolSize ) ) ;

		// The real number of individual for the pool having the most of them
		let maxPoolSize = Math.ceil( remainingPopulation.length / poolCount ) ;

		//log.hdebug( "Starting Tourney phase #%i (remaining: %f, pools: %f, max pool size: %f/%f)" , phase , remainingPopulation.length , poolCount , maxPoolSize , this.tourneyPoolSize ) ;

		// Winner of the current phase will have their score set to this value when reaching the next phase
		nextPhaseStartingScore += maxPoolSize ;

		let pools = [] ;
		for ( let index = 0 ; index < poolCount ; index ++ ) { pools[ index ] = [] ; }

		// Create pools, since the original array is sorted by strength, we avoid pushing consecutive individual in the same pool
		for ( let index = 0 ; index < remainingPopulation.length ; index ++ ) {
			pools[ index % poolCount ].push( remainingPopulation[ index ] ) ;
		}

		// Make each individual in a pool to compete versus each other
		for ( let pool of pools ) { await this.trialVersusAll( pool ) ; }

		if ( poolCount > 1 ) {
			remainingPopulation.length = 0 ;

			for ( let pool of pools ) {
				let qualifiedCount = Math.ceil( pool.length * this.tourneyQualificationRate ) ;

				// Sort from the best to the worst, only qualify the first x individual
				pool.sort( ( a , b ) => b.metadata.score - a.metadata.score ) ;

				for ( let index = 0 ; index < qualifiedCount ; index ++ ) {
					let network = pool[ index ] ;
					network.metadata.score = nextPhaseStartingScore ;
					remainingPopulation.push( network ) ;
				}
			}
		}

		phase ++ ;

	} while( poolCount > 1 ) ;
} ;



Evolution.prototype.produceNextGeneration = function() {

	// Selection

	var selectionCount = Math.ceil( this.selectionRate * this.population.length ) ,
		eliteCount = Math.ceil( this.eliteRate * this.population.length ) ,
		maxPopulation = this.populationSize + this.islands.length ;

	// Sort from the best to the worst, set only select the elite
	this.population.sort( ( a , b ) => b.metadata.score - a.metadata.score ) ;

	// Things to do to the best network
	if ( this.population.length ) {
		let network = this.population[ 0 ] ;
		network.metadata.best = true ;
		network.metadata.elite = true ;
		network.metadata.selected = true ;
		network.metadata.immunity = Math.max( this.bestImmunity , this.eliteImmunity , ( network.metadata.immunity || 0 ) - 1 ) ;
		network.metadata.savedByImmunity = false ;
	}

	// Things to do to elite networks
	for ( let index = 1 ; index < eliteCount ; index ++ ) {
		let network = this.population[ index ] ;
		network.metadata.best = false ;
		network.metadata.elite = true ;
		network.metadata.selected = true ;
		network.metadata.immunity = Math.max( this.eliteImmunity , ( network.metadata.immunity || 0 ) - 1 ) ;
		network.metadata.savedByImmunity = false ;
	}

	// Things to do to selected networks
	for ( let index = eliteCount ; index < selectionCount ; index ++ ) {
		let network = this.population[ index ] ;
		network.metadata.best = false ;
		network.metadata.elite = false ;
		network.metadata.selected = true ;
		network.metadata.immunity = Math.max( 0 , ( network.metadata.immunity || 0 ) - 1 ) ;
		network.metadata.savedByImmunity = false ;
	}

	// Try to save some networks having immunity
	for ( let index = selectionCount ; index < this.population.length ; index ++ ) {
		let network = this.population[ index ] ;

		if ( network.metadata.immunity ) {
			network.metadata.best = false ;
			network.metadata.elite = false ;
			network.metadata.selected = true ;
			network.metadata.immunity -- ;
			network.metadata.savedByImmunity = true ;
			this.population[ selectionCount ] = network ;
			selectionCount ++ ;
		}
	}

	// Finally, cut off remaining networks
	this.population.length = selectionCount ;


	// Each island send is best emissary back to mainland

	if ( ! this.isIsland ) {
		// Merge back population into mainland?
		this.islands = this.islands.filter( island => {
			if ( island.islandTimeout -- > 0 ) { return true ; }

			// If the island reached the timeout, its population is merged back into the mainland
			log.hdebug( "Island '%s' is merged back into mainland" , island.id ) ;
			maxPopulation += island.population.length ;
			this.population.push( ... island.population ) ;
			return false ;
		} ) ;

		// Return the best individual (cloned) back to mainland.
		// Also check if the top-individual is from this island, and if it is, cut its timeout dramatically.
		// Island are meant to protect innovation, if an island is already dominating the world, there is no need to protect it,
		// let's merge it back to the Mainland's Jungle!
		for ( let island of this.islands ) {
			if ( ! island.population[ 0 ] ) { continue ; }

			if ( this.population[ 0 ] && this.population[ 0 ].metadata && this.population[ 0 ].metadata.land === island.id ) {
				island.islandTimeout = Math.floor( island.islandTimeout * 0.6 ) ;
				log.hdebug( "Cutting %s timeout because it is already dominating the mainland (new timeout: %i)" , island.id , island.islandTimeout ) ;
			}

			let newNetwork = island.population[ 0 ].clone() ;
			newNetwork.metadata.generation = this.generation ;
			newNetwork.metadata.land = island.id ;
			newNetwork.metadata.id = newNetwork.metadata.land + ':' + newNetwork.metadata.generation + ':rt:' + ( this.networkIdCounter ++ ) ;
			this.population.push( newNetwork ) ;
		}
	}


	// Cloning + Mutation or Cross-Over

	var eliteIndex = 0 ;

	while ( this.population.length < maxPopulation ) {
		let network = this.population[ eliteIndex ] ;

		// A Magic formula, when it reaches the half, the chance have 22% of the potential, 5% when it reach the max,
		// 1% for one and a half, 0.25% for twice, and so on...
		let islandChance = 1 / Math.exp( 3 * this.islands.length / this.maxIslands ) ;
		let crossedOver = false ;
		let newNetwork ;
		let codeStr = '' ;

		if ( Math.random() < this.crossOverChance ) {
			let mateIndex = Math.floor( Math.min( this.population.length , Math.max( eliteCount , 5 ) ) * Math.random() ) ;
			let mateNetwork = this.population[ mateIndex ] ;
			//let compat ;

			//if ( mateNetwork !== network && ( compat = network.computeCompatibility( mateNetwork ) ) >= this.crossOverCompatibility ) {
			if ( mateNetwork !== network && network.computeCompatibility( mateNetwork ) >= this.crossOverCompatibility ) {
				newNetwork = network.crossOver( mateNetwork ) ;
				//log.hdebug( "Crossed-over!\nParent #1: %[5]Y\nParent #2: %[5]Y\nChild: %[5]Y" , network , mateNetwork , newNetwork ) ;
				//log.hdebug( "Cross-over! Compat. was: %[.3]f" , compat ) ;
				islandChance *= this.crossOverIslandChance ;
				crossedOver = true ;
			}
			//else if ( mateNetwork !== network ) { log.hdebug( "Was not compatible!" ) ; }
		}

		if ( crossedOver ) {
			codeStr = 'x' ;
		}
		else {
			newNetwork = network.clone() ;
			let importance = newNetwork.mutate( this.mutation , this.newUnitId , network ) ;
			codeStr = 'mu' + ( newNetwork.metadata.muCode || '' ) ;
			islandChance *= this.mutationIslandChance * importance ;
		}

		newNetwork.metadata.generation = this.generation ;

		if ( ! this.isIsland && this.maxIslands >= 1 && Math.random() < islandChance ) {
			let newIsland = this.createIsland() ;
			newNetwork.metadata.land = newIsland.id ;
			newNetwork.metadata.id = newNetwork.metadata.land + ':' + newNetwork.metadata.generation + ':' + codeStr + ':' + ( newIsland.networkIdCounter ++ ) ;
			newIsland.population.push( newNetwork ) ;
			log.hdebug( "Create a new Island: %s, population: %i, timeout: %i, for individual: %s, islandChance was: %[.5]f" , newIsland.id , newIsland.populationSize , newIsland.islandTimeout , newNetwork.metadata.id , islandChance ) ;

			// Populate the island, but no cross-over allowed here
			newIsland.produceNextGeneration( true ) ;

			this.islands.push( newIsland ) ;
		}
		else {
			// Should clone keep their original land origins?
			//newNetwork.metadata.land = this.id ;
			newNetwork.metadata.land = network.metadata.land || this.id ;
			newNetwork.metadata.id = newNetwork.metadata.land + ':' + newNetwork.metadata.generation + ':' + codeStr + ':' + ( this.networkIdCounter ++ ) ;
			this.population.push( newNetwork ) ;
		}

		eliteIndex = ( eliteIndex + 1 ) % eliteCount ;
	}
} ;

