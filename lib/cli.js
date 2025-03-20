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
const path = require( 'path' ) ;
const kungFig = require( 'kung-fig' ) ;
const tree = require( 'tree-kit' ) ;
const termkit = require( 'terminal-kit' ) ;
const term = termkit.terminal ;

const nk = require( '..' ) ;

const Logfella = require( 'logfella' ) ;

const log = Logfella.global.use( 'nk-evolve' ) ;

const cliManager = require( 'utterminal' ).cli ;



exports.run = function() {
	/* eslint-disable indent */
	cliManager.app( {
			package: require( '../package.json' ) ,
			name: "Neurons Kit Run" ,
			description: "Run a network, providing input on the command line."
		} )
		.usage( "[--parameter1 value1] [--parameter2 value2] [...]" )
		.introIfTTY
		.commonOptions
		.camel
		.arg( 'network-file' ).string.mandatory
			.description( "The neural network file (.json)" )
		.restArgs( 'inputs' ).arrayOf.number
			.description( "The network input values" )
		.opt( 'svg' )
			.description( "Create an SVG file of the network" ) ;
	/* eslint-enable indent */

	var args = cliManager.run() ;

	Logfella.global.addTransport( 'file' , {
		minLevel: 'error' ,
		path: path.join( process.cwd() , 'error.log' )
	} ) ;

	runNetwork( args ) ;
} ;



exports.evolve = function() {
	/* eslint-disable indent */
	cliManager.app( {
			package: require( '../package.json' ) ,
			name: "Neurons Kit Evolve" ,
			description: "Evolve a population."
		} )
		.usage( "[--parameter1 value1] [--parameter2 value2] [...]" )
		.introIfTTY
		.commonOptions
		.camel
		.arg( 'project-file' ).string.mandatory
			.description( "The evolution project file (.kfg)" )
		.arg( 'population-file' ).string.mandatory
			.description( "The population file, containing all individuals (.json)" )
		.opt( [ 'rounds' , 'r' ] , 1 ).integer
			.description( "Number of rounds/epochs/generations to run" )
		.opt( [ 'immunity' ] ).integer
			.description( "Give immunity to the next gen best individual" )
		.opt( [ 'remove-immunity' ] ).flag
			.description( "Remove immunity" )
		.opt( 'svg' )
			.description( "Create an SVG file of the current best network" ) ;
	/* eslint-enable indent */

	var args = cliManager.run() ;

	Logfella.global.addTransport( 'file' , {
		minLevel: 'error' ,
		path: path.join( process.cwd() , 'error.log' )
	} ) ;

	//console.log( args ) ;
	var config = kungFig.load( args.projectFile ) ;
	//console.log( config ) ;

	tree.extend( { deep: true } , config , args ) ;
	//console.log( config ) ;

	// Manage config values
	config.mutation = new nk.Mutation( config.mutation || config.mutations ) ;
	delete config.mutations ;

	if ( config.immunity ) { config.evolution.immunity = config.immunity ; }
	if ( config.removeImmunity ) { config.evolution.removeImmunity = config.removeImmunity ; }

	if ( config.sandbox ) {
		config.evolution.createNetworkFn = config.sandbox.createNetworkFn || config.sandbox.createNetwork ;
		config.evolution.trialFn = config.sandbox.trialFn || config.sandbox.trial ;
		config.evolution.trialVersusFn = config.sandbox.trialVersusFn || config.sandbox.trialVersus ;
	}

	runEvolution( config ) ;
} ;



async function runNetwork( config ) {
	var network ;

	try {
		term( "Loading network: " ) ;
		network = await nk.Network.load( config.networkFile ) ;
		term( "%s ^GOK^:\n" , config.networkFile ) ;
	}
	catch ( error ) {
		if ( error.code === 'ENOENT' ) {
			term.red( "not found\n" ) ;
			process.exit( 1 ) ;
		}
		else {
			term.red( "%E\n" , error ) ;
			throw error ;
		}
	}

	if ( ! config.inputs ) {
		term.red( "No input provided.\n" ) ;
		process.exit( 1 ) ;
	}

	if ( config.inputs.length !== network.inputUnits.length ) {
		term.red( "Input mismatch, the network requires %i inputs, but got: %i.\n" , network.inputUnits.length , config.inputs.length ) ;
		process.exit( 1 ) ;
	}

	network.setInputs( config.inputs ) ;
	network.forwardSignal() ;
	var outputs = network.getNamedOutputs() ;

	term( "\nNetwork outputs: \n\n" ) ;

	for ( let outputName of Object.keys( outputs ) ) {
		let output = outputs[ outputName ] ;
		term( "  %s: %[.5]f\n" , outputName , output ) ;
	}

	term( "\n\n" ) ;

	if ( config.svg ) {
		await saveSvg( network , config ) ;
	}
}



async function runEvolution( config ) {
	// In the config, mutation and networkRunner are stored in a side-object, ref it in the evolution's params
	config.evolution.mutation = config.mutation ;
	config.evolution.networkRunner = config.networkRunner ;
	var evolution = new nk.Evolution( config.evolution ) ;

	try {
		term( "Loading population: " ) ;
		await evolution.loadPopulation( config.populationFile ) ;
		term( "%s ^GOK^:\n" , config.populationFile ) ;
	}
	catch ( error ) {
		if ( error.code === 'ENOENT' ) {
			term( "not found, starting a new population\n" ) ;
		}
		else {
			term.red( "%E\n" , error ) ;
			throw error ;
		}
	}

	await evolution.init() ;

	var isSaved = false , round ;

	for ( round = 1 ; round <= config.rounds ; round ++ ) {
		isSaved = false ;
		displayPopulation( evolution , config , round , true ) ;

		await evolution.runNextGeneration() ;

		if ( round % 20 === 0 ) {
			await savePopulation( evolution , config ) ;
			isSaved = true ;
		}
	}

	displayPopulation( evolution , config , round - 1 , false ) ;

	let bestNetwork = evolution.population[ 0 ] ;

	if ( bestNetwork ) {
		await saveNetwork( bestNetwork , config ) ;

		if ( config.svg ) {
			await saveSvg( evolution.population[ 0 ] , config ) ;
		}
	}

	if ( ! isSaved ) {
		await savePopulation( evolution , config ) ;
	}
}



function displayPopulation( evolution , config , round , isStart = true ) {
	let islandsPopulation = evolution.islands.reduce( ( p , island ) => p + island.population.length , 0 ) ;

	if ( isStart ) { term( "\nStarting generation #%i (%i/%i)\n" , evolution.generation + 1 , round , config.rounds ) ; }
	else { term( "\nEnding generation #%i (%i/%i)\n" , evolution.generation , round , config.rounds ) ; }

	term( "    Total population: %i\n" , evolution.population.length + islandsPopulation ) ;
	term( "    Islands: %i\n" , evolution.islands.length ) ;
	term( "    Islands population: %i\n" , islandsPopulation ) ;
	term( "    Round duration: %[.3!a]t\n" , evolution.lastRoundTime ) ;

	let eliteCount = 0 ,
		eliteScoreSum = 0 ,
		selectedCount = 0 ,
		immunity = 0 ,
		savedByImmunity = 0 ;

	for ( let network of evolution.population ) {
		if ( network.metadata.elite ) {
			eliteCount ++ ;
			eliteScoreSum = network.metadata.score ;
		}

		if ( network.metadata.selected ) { selectedCount ++ ; }
		if ( network.metadata.immunity ) { immunity ++ ; }
		if ( network.metadata.savedByImmunity ) { savedByImmunity ++ ; }
	}

	term( "\n    Mainland stats:\n" ) ;
	term( "        Population: %i\n" , evolution.population.length ) ;
	term( "        Selected: %i\n" , selectedCount ) ;
	term( "        Elite: %i\n" , eliteCount ) ;
	term( "        Elite average score: %[.5]f\n" , eliteScoreSum / eliteCount ) ;
	term( "        Immunity: %i\n" , immunity ) ;
	term( "        Saved by immunity: %i\n" , savedByImmunity ) ;

	if ( evolution.population[ 0 ] ) {
		let best = evolution.population[ 0 ] ;

		term( "\n    Mainland's best individual: %s\n" , best.metadata.id ) ;
		term( "        Score: %[.5]f (penalty: %[.5]f)\n" , best.metadata.score , best.metadata.penalty ) ;
		term( "        Trials: %i\n" , best.metadata.trials ) ;

		if ( best.metadata.trialData ) {
			term( "        Trial data: %N\n" , best.metadata.trialData ) ;
		}

		term( "        Origin: %s\n" , best.metadata.land ) ;
		term( "        Generation: %s\n" , best.metadata.generation ) ;
		term( "        Hidden units: %i\n" , best.hiddenUnits.length ) ;
		term( "        Connections: %i\n" , best.orderedUnits.reduce( ( c , unit ) => c + unit.synapses.length , 0 ) ) ;
	}
}



async function savePopulation( evolution , config ) {
	term( "Saving population %s: " , config.populationFile ) ;

	try {
		await evolution.savePopulation( config.populationFile ) ;
		term( "^GOK^:\n" ) ;
	}
	catch ( error ) {
		term( "^R%s^:\n" , error ) ;
	}
}



async function saveNetwork( network , config ) {
	//var filePath = path.join( process.cwd() , 'best-network.json' ) ;
	var filePath = 'best-network.json' ;

	term( "Saving network %s: " , filePath ) ;

	try {
		await network.save( filePath , true ) ;
		term( "^GOK^:\n" ) ;
	}
	catch ( error ) {
		term( "^R%s^:\n" , error ) ;
	}
}



async function saveSvg( network , config ) {
	var filePath = config.svg && typeof config.svg === 'string' ? config.svg : 'network.svg' ;

	var visualization = new nk.Visualization( network ) ;
	var vg = visualization.toVg() ;
	var svg = await vg.renderSvgText() + '\n' ;

	term( "Saving best network SVG %s: " , filePath ) ;

	try {
		await fs.promises.writeFile( filePath , svg ) ;
		term( "^GOK^:\n" ) ;
	}
	catch ( error ) {
		term( "^R%s^:\n" , error ) ;
	}
}

