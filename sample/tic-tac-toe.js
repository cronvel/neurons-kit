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
const arrayKit = require( 'array-kit' ) ;

const TicTacToe = require( './TicTacToe.js' ) ;



var mutation = new nk.Mutation( {
	newConnectionChance: 0.05 ,
	removeConnectionChance: 0.02 ,
	newUnitChance: 0.03 ,
	removeUnitChance: 0.01 ,
	mutateActivationChance: 0.02 ,
	biasDelta: 0.25 ,
	weightDelta: 0.25 ,
	newConnectionWeight: 0.1 ,
	newUnitBias: 0.1 ,
	removeConnectionThreshold: 0.25 ,
	removeUnitThreshold: 0.25 ,
	activations: [ 'relu' , 'relu2' , 'sigmoid' , 'softPlus' ]
} ) ;

var createNetworkFn = () => {
	var network = new nk.Network() ;
	network.setNetworkModel( {
		inputs: arrayKit.range( 9 ).map( index => 'board:' + index ) ,
		outputs: arrayKit.range( 9 ).map( index => 'board:' + index ) ,
		outputActivation: 'sigmoid'
	} ) ;

	network.init() ;
	network.mutateAddConnection( mutation ) ;
	network.randomize() ;
	
	return network ;
} ;

var networkPlay = ( network , board ) => {
	var cell , score ,
		maxScore = - Infinity ,
		outputs = network.process( board ) ;
	
	outputs.forEach( ( output , index ) => {
		var score = output + 0.5 * Math.random() ;
		if ( score > maxScore ) { maxScore = score ; cell = index ; }
	} ) ;
	
	return cell ;
} ;

var testFn = networks => {
	var game = new TicTacToe() ;
	
	var winner = game.run(
		board => networkPlay( networks[ 0 ] , board ) ,
		board => networkPlay( networks[ 1 ] , board )
	) ;
	
	console.log( game.reason + '\n' + game.boardStr() ) ;
	
	return winner ? [ winner , -winner ] : [ 0 , 0 ] ;
} ;

var evolution = new nk.Evolution( {
	createNetworkFn , testFn , mutation ,
	versus: 1 ,
	testCount: 5 ,
	selectionRate: 0.15
} ) ;

async function run() {
	await evolution.init() ;
	await evolution.runNextGeneration() ;
}

run() ;

