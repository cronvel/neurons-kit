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



const nk = require( '../..' ) ;
const arrayKit = require( 'array-kit' ) ;
const termkit = require( 'terminal-kit' ) ;
const term = termkit.terminal ;

const fs = require( 'fs' ) ;

const TicTacToe = require( './TicTacToe.js' ) ;
const sandbox = require( './sandbox.js' ) ;



term.on( 'key' , key => {
	if ( key === 'CTRL_C' ) { process.exit() ; }
} ) ;

var game = new TicTacToe() ;



const AZERTY_GRID = 'azeqsdwxc' ;

async function interactivePlay( playerName ) {
	var cell , choice , indexOf ;

	term( "\nBoard:\n%s" , game.boardStr() ) ;
	term( "%s's turn: " , playerName ) ;

	choice = await term.inputField().promise ;
	choice = choice[ 0 ] ;
	
	if ( ( indexOf = AZERTY_GRID.indexOf( choice ) ) !== -1 ) { cell = indexOf ; }
	else { cell = parseInt( choice , 10 ) ; }

	term( '\n' ) ;
	return cell ;
}



async function runPvP() {
	var p1 = 'Player 1' ,
		p2 = 'Player 2' ;
	
	await game.run(
		() => interactivePlay( p1 ) ,
		() => interactivePlay( p2 )
	) ;

	term( "\nBoard:\n%s" , game.boardStr() ) ;
	
	if ( game.winner ) {
		term( "\n^C%s^ ^Ywin!^ ^-%s^:\n" , game.winner > 0 ? p1 : p2 , game.reason !== "win" ? '(' + game.reason + ')' : '' ) ;
	}
	else {
		term( "\n^YDraw!^:\n" ) ;
	}
	
	process.exit() ;
}



async function runPvAi( filePath , index = 0 ) {
	var p1 = 'Player' ,
		p2 = 'Computer' ;
	
	var data = JSON.parse( await fs.promises.readFile( filePath , 'utf8' ) ) ;
	
	if ( data.population ) {
		// This not a brain, this is a population, so get one individual
		index = Math.min( index , data.population.length - 1 ) ;
		data = data.population[ index ] ;
		p2 += ' #' + ( index + 1 ) ;
	}
	
	if ( data.metadata.generation ) {
		p2 += ' Gen. ' + data.metadata.generation ;
	}
	
	var network = nk.Network.import( data ) ;
	
	await game.run(
		() => interactivePlay( p1 ) ,
		board => {
			term( "\nBoard:\n%s" , game.boardStr() ) ;
			term( "%s's turn: " , p2 ) ;
			var cell = sandbox.networkPlay( network , board ) ;
			term( '%i\n' , cell ) ;
			return cell ;
		}
	) ;

	term( "\nBoard:\n%s" , game.boardStr() ) ;
	
	if ( game.winner ) {
		term( "\n^C%s^ ^Ywin!^ ^-%s^:\n" , game.winner > 0 ? p1 : p2 , game.reason !== "win" ? '(' + game.reason + ')' : '' ) ;
	}
	else {
		term( "\n^YDraw!^:\n" ) ;
	}
	
	process.exit() ;
}



if ( process.argv[ 2 ] ) {
	runPvAi( process.argv[ 2 ] , parseInt( process.argv[ 3 ] , 10 ) || 0 ) ;
}
else {
	runPvP() ;
}

