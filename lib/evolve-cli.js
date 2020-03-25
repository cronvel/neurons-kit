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
		.arg( 'project' ).string.mandatory
			.description( "The evolution project file." )
		.opt( [ 'rounds' , 'r' ] , 1 ).integer
			.description( "Number of rounds/epochs/generations to run." ) ;
	/* eslint-enable indent */

	var args = cliManager.run() ;
	
	console.log( args ) ;
	var config = kungFig.load( args.project ) ;
	console.log( config ) ;
	
	run( config ) ;
} ;



async function run( config ) {
	config.mutation = new nk.Mutation( config.mutation || config.mutations ) ;

	var evolution = new nk.Evolution( config.evolution ) ;

	try {
		await evolution.loadPopulation( 'tic-tac-toe.evopop.json' ) ;
		term( "Loaded an existing population.\n" ) ;
	}
	catch ( error ) {
		term( "Starting a new population. (%s)\n" , error ) ;
	}
	
	await evolution.init() ;
	
	while ( rounds -- ) {
		term( "Starting generation #%i (%i remaining round(s) to go)\n" , evolution.generation + 1 , rounds + 1 ) ;
		await evolution.runNextGeneration() ;
	}

	await evolution.savePopulation( 'tic-tac-toe.evopop.json' ) ;
}

