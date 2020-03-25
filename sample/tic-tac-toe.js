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
const termkit = require( 'terminal-kit' ) ;
const term = termkit.terminal ;

const TicTacToe = require( './TicTacToe.js' ) ;



var game = new TicTacToe() ;

async function interactivePlay( playerName ) {
	term( "\nBoard:\n%s" , game.boardStr() ) ;
	term( "%s's turn: " , playerName ) ;

	var cell = parseInt( await term.inputField().promise , 10 ) ;

	term( '\n' ) ;
	return cell ;
}

async function run() {
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

term.on( 'key' , key => {
	if ( key === 'CTRL_C' ) { process.exit() ; }
} ) ;

run() ;

