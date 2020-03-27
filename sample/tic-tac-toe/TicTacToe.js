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



const EventEmitter = require( 'events' ).EventEmitter ;



function TicTacToe() {
	this.board = new Array( 9 ).fill( 0 ) ;
	this.sideToPlay = Math.random() < 0.5 ? -1 : 1 ;
	this.end = false ;
	this.winner = 0 ;
	this.reason = null ;
}

TicTacToe.prototype = Object.create( EventEmitter.prototype ) ;
TicTacToe.prototype.constructor = TicTacToe ;

module.exports = TicTacToe ;



TicTacToe.prototype.getBoard = function() { return [ ... this.board ] ; }



// Player 1 is the positive one, and player 2 the negative one
TicTacToe.prototype.run = async function( p1Fn , p2Fn ) {
	var cell , userlandBoard ;

	while ( ! this.end ) {
		this.emit( 'position' ) ;

		if ( this.sideToPlay > 0 ) {
			cell = await p1Fn( this.board.map( cell => cell * this.sideToPlay ) ) ;
		}
		else {
			cell = await p2Fn( this.board.map( cell => cell * this.sideToPlay ) ) ;
		}
		
		this.play( cell ) ;
	}

	return this.winner ;
} ;



TicTacToe.prototype.play = function( cell ) {
	// Forbidden move = instant lose
	if ( cell < 0 || cell >= 9 || this.board[ cell ] ) {
		//console.log( "forbidden move:" , cell ) ;
		return this.setLoser() ;
	}

	this.board[ cell ] = this.sideToPlay ;

	// Switch sideToPlay
	if ( ! this.checkEnd() ) { this.sideToPlay *= -1 ; }
} ;



TicTacToe.prototype.checkEnd = function() {
	var i ,
		v = this.sideToPlay ;

	// Check rows
	for ( i = 0 ; i < 9 ; i += 3 ) {
		if ( this.board[ i ] === v && this.board[ i + 1 ] === v && this.board[ i + 2 ] === v ) { return this.setWinner() ; }
	}

	// Check columns
	for ( i = 0 ; i < 3 ; i ++ ) {
		if ( this.board[ i ] === v && this.board[ i + 3 ] === v && this.board[ i + 6 ] === v ) { return this.setWinner() ; }
	}

	// Check diagonal
	if ( this.board[ 0 ] === v && this.board[ 4 ] === v && this.board[ 8 ] === v ) { return this.setWinner() ; }
	if ( this.board[ 2 ] === v && this.board[ 4 ] === v && this.board[ 6 ] === v ) { return this.setWinner() ; }

	if ( this.board.every( cell => cell !== 0 ) ) { return this.setDraw() ; }

	return false ;
} ;



TicTacToe.prototype.setWinner = function() {
	this.winner = this.sideToPlay ;
	this.end = true ;
	this.reason = 'win' ;
	this.emit( 'end' , this.reason , this.winner ) ;
	return true ;
} ;



TicTacToe.prototype.setLoser = function() {
	this.winner = -1 * this.sideToPlay ;
	this.end = true ;
	this.reason = 'forbiddenMove' ;
	this.emit( 'end' , this.reason , this.winner ) ;
	return true ;
} ;



TicTacToe.prototype.setDraw = function() {
	this.winner = 0 ;
	this.end = true ;
	this.reason = 'draw' ;
	this.emit( 'end' , this.reason , this.winner ) ;
	return true ;
} ;



TicTacToe.prototype.boardStr = function() {
	var i , j ,
		cells = [ ' O ' , '   ' , ' X ' ] ,
		column = '|' ,
		line = '+---+---+---+\n' ,
		str = line ;

	// For each rows
	for ( i = 0 ; i < 9 ; i += 3 ) {
		str += column ;

		for ( j = i ; j < i + 3 ; j ++ ) {
			str += cells[ this.board[ j ] + 1 ] + column ;
		}

		str += '\n' + line ;
	}

	return str ;
} ;

