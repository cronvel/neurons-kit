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



//const fs = require( 'fs' ) ;
const path = require( 'path' ) ;
const kungFig = require( 'kung-fig' ) ;
const tree = require( 'tree-kit' ) ;
const termkit = require( 'terminal-kit' ) ;
const term = termkit.terminal ;

const nk = require( '..' ) ;

const Logfella = require( 'logfella' ) ;

const log = Logfella.global.use( 'nk-evolve' ) ;

const cliManager = require( 'utterminal' ).cli ;



module.exports = function() {
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
			.description( "Remove immunity" ) ;
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
	
	run( config ) ;
} ;



async function run( config ) {
	// In the config, mutation are stored in a side-object, ref it in the evolution's params
	config.evolution.mutation = config.mutation ;
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
	
	var isSaved = false ;
	
	for ( let round = 1 ; round <= config.rounds ; round ++ ) {
		isSaved = false ;
		let islandsPopulation = evolution.islands.reduce( ( p , island ) => p + island.population.length , 0 ) ;

		term( "\nStarting generation #%i (%i/%i)\n" , evolution.generation + 1 , round , config.rounds ) ;
		term( "    Total population: %i\n" , evolution.population.length + islandsPopulation ) ;
		term( "    Mainland population: %i\n" , evolution.population.length ) ;
		term( "    Islands: %i\n" , evolution.islands.length ) ;
		term( "    Islands population: %i\n" , islandsPopulation ) ;

		if ( evolution.population.length >= evolution.eliteRate * evolution.populationSize ) {
			let i ,
				sum = 0 ,
				iMax = Math.ceil( evolution.eliteRate * evolution.populationSize ) ;

			for ( i = 0 ; i < iMax ; i ++ ) {
				sum += evolution.population[ i ].metadata.score ;
			}

			term( "    Mainland's Elite average score: %[.3]f\n" , sum / iMax ) ;
		}

		if ( evolution.population[ 0 ] ) {
			let top = evolution.population[ 0 ] ;

			term( "    Mainland's top individual: %s\n" , top.metadata.id ) ;
			term( "        Score: %[.3]f (penalty: %[.3]f)\n" , top.metadata.score , top.metadata.penalty ) ;
			term( "        Trials: %[.3]f\n" , top.metadata.trials ) ;
			
			if ( top.metadata.trialData ) {
				term( "        Trial data: %N\n" , top.metadata.trialData ) ;
			}
			
			term( "        Origin: %s\n" , top.metadata.land ) ;
			term( "        Generation: %s\n" , top.metadata.generation ) ;
			term( "        Hidden units: %i\n" , top.hiddenUnits.length ) ;
			term( "        Connections: %i\n" , top.orderedUnits.reduce( ( c , unit ) => c + unit.synapses.length , 0 ) ) ;
		}

		await evolution.runNextGeneration() ;

		if ( round % 20 === 0 ) {
			await savePopulation( evolution , config ) ;
			isSaved = true ;
		}
	}

	if ( ! isSaved ) {
		await savePopulation( evolution , config ) ;
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

