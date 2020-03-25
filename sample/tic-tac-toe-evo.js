#!/usr/bin/env node
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



const nk = require( '..' ) ;
const TicTacToe = require( './TicTacToe.js' ) ;

const arrayKit = require( 'array-kit' ) ;

const termkit = require( 'terminal-kit' ) ;
const term = termkit.terminal ;



var rounds = parseInt( process.argv[ 2 ] , 10 ) || 1 ;



var mutation = new nk.Mutation( {
	newConnectionChance: 0.05 ,
	removeConnectionChance: 0.02 ,
	newUnitChance: 0.03 ,
	removeUnitChance: 0.01 ,
	mutateActivationChance: 0.02 ,
	biasDelta: 0.5 ,
	weightDelta: 0.5 ,
	newConnectionWeight: 0.1 ,
	newUnitBias: 0.1 ,
	removeConnectionThreshold: 0.25 ,
	removeUnitThreshold: 0.25 ,
	activations: [ 'relu' , 'relu2' , 'sigmoid' , 'softPlus' ]
} ) ;

var createNetworkFn = () => {
	var network = new nk.Network() ;
	
	// Split input, to ease evolution, otherwise the network would have to create new units
	// to re-create internally the "cell-is-empty" information to avoid illegal moves
	var inputs = [] ;
	inputs.push( ... arrayKit.range( 9 ).map( index => 'board:self:' + index ) ) ;
	inputs.push( ... arrayKit.range( 9 ).map( index => 'board:other:' + index ) ) ;

	network.setNetworkModel( {
		inputs ,
		outputs: arrayKit.range( 9 ).map( index => 'board:' + index ) ,
		outputActivation: 'sigmoid'
	} ) ;

	network.init() ;
	network.mutateAddNewConnection( mutation ) ;
	network.randomize() ;
	
	return network ;
} ;

var networkPlay = ( network , board ) => {
	var cell , score , outputs ,
		inputs = [] ,
		maxScore = - Infinity ;

	// Split input, see above...
	inputs.push( ... board.map( cell_ => cell_ > 0 ? 1 : 0 ) ) ;
	inputs.push( ... board.map( cell_ => cell_ < 0 ? 1 : 0 ) ) ;

	outputs = network.process( inputs ) ;

	outputs.forEach( ( output , index ) => {
		var score = output + 0.5 * Math.random() ;
		if ( score > maxScore ) { maxScore = score ; cell = index ; }
	} ) ;
	
	return cell ;
} ;

var testFn = async ( networks ) => {
	var game = new TicTacToe() ;
	
	var winner = await game.run(
		board => networkPlay( networks[ 0 ] , board ) ,
		board => networkPlay( networks[ 1 ] , board )
	) ;
	
	//console.log( game.reason + '\n' + game.boardStr() ) ;
	if ( process.argv[ 3 ] === 'r' ) { console.log( game.reason ) ; }
	
	return winner ? [ winner , -winner ] : [ 0 , 0 ] ;
} ;

var evolution = new nk.Evolution( {
	createNetworkFn , testFn , mutation ,
	populationSize: 1000 ,
	testCount: 100 ,
	versus: 1 ,
	selectionRate: 0.15
} ) ;

async function run() {
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

run() ;

