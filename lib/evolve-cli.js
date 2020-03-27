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
//const path = require( 'path' ) ;
const kungFig = require( 'kung-fig' ) ;
const tree = require( 'tree-kit' ) ;
const termkit = require( 'terminal-kit' ) ;
const term = termkit.terminal ;

const nk = require( '..' ) ;

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
		term( "not found, starting a new population\n" ) ;
	}
	
	await evolution.init() ;
	
	for ( let round = 1 ; round <= config.rounds ; round ++ ) {
		term( "Starting generation #%i (%i/%i)\n" , evolution.generation + 1 , round , config.rounds ) ;
		await evolution.runNextGeneration() ;
	}

	term( "Saving population %s: " , config.populationFile ) ;
	try {
		await evolution.savePopulation( config.populationFile ) ;
		term( "^GOK^:\n" ) ;
	}
	catch ( error ) {
		term( "^R%s^:\n" , error ) ;
	}
}

