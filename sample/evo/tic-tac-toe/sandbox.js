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



const nk = require( '../../..' ) ;
const arrayKit = require( 'array-kit' ) ;
const string = require( 'string-kit' ) ;
const TicTacToe = require( './TicTacToe.js' ) ;



// Things to configure with --sanbox.* CLI options
exports.reason = false ;
exports.winnerScore = 1 ;
exports.loserScore = -1 ;
exports.drawScore = 0 ;
exports.illegalMoveScore = -10 ;



/*
	For instance, the lib doesn't support isomorphisms.
	When it will, Tic Tac Toe has 7 isomorphic transformations:
		* horizontal and vertical symmetry
		* two diagonal symmetries
		* clockwise and counter-clockwise rotations
		* 180° rotation (or central symmetry)
	It should apply to both input and output units.
	Hidden unit connecting to any input or output with isomorphism are isomorphic too.
*/
exports.createNetwork = () => {
	var network = new nk.Network() ;

	// Split input, to ease evolution, otherwise the network would have to create new units
	// to re-create internally the "cell-is-empty" information to avoid illegal moves
	var inputs = [] ;
	inputs.push( ... arrayKit.range( 9 ).map( index => 'board:self:' + index ) ) ;
	inputs.push( ... arrayKit.range( 9 ).map( index => 'board:other:' + index ) ) ;

	network.setNetworkModel( {
		inputs ,
		outputs: arrayKit.range( 9 ).map( index => 'board:' + index ) ,
		unconnected: true ,
		outputActivation: 'hardSigmoid'
	} ) ;

	network.init() ;
	network.mutateAddNewConnection( new nk.Mutation() ) ;
	network.randomize() ;

	return network ;
} ;



const DEFAULT_NETWORK_PLAY_OPTIONS = {} ;

exports.networkPlay = ( network , board , options = DEFAULT_NETWORK_PLAY_OPTIONS ) => {
	var cell , outputs ,
		inputs = [] ,
		maxScore = -Infinity ;

	// Split input, see above...
	inputs.push( ... board.map( cell_ => cell_ > 0 ? 1 : 0 ) ) ;
	inputs.push( ... board.map( cell_ => cell_ < 0 ? 1 : 0 ) ) ;

	outputs = network.process( inputs ) ;

	outputs.forEach( ( output , index ) => {
		var score = output + 0.5 * Math.random() ;
		if ( score > maxScore ) { maxScore = score ; cell = index ; }
	} ) ;
	
	if ( options.displayOutput ) {
		console.log( boardOutput( outputs ) ) ;
	}

	return cell ;
} ;



exports.randomPlay = board => {
	var allowed = arrayKit.range( 9 ).filter( index => board[ index ] === 0 ) ;
	var cell = allowed[ Math.floor( allowed.length * Math.random() ) ] ;
	//console.log( board , allowed , cell ) ;

	return cell ;
} ;



function boardOutput( outputs ) {
	var i , j ,
		column = '|' ,
		line = '+-----+-----+-----+\n' ,
		str = line ;

	// For each rows
	for ( i = 0 ; i < 9 ; i += 3 ) {
		str += column ;

		for ( j = i ; j < i + 3 ; j ++ ) {
			str += string.format( "%[.3!]f" , outputs[ j ] ) + column ;
		}

		str += '\n' + line ;
	}

	return str ;
}



exports.trialVersus = async ( networks , orderMatters ) => {
	var game = new TicTacToe( ! orderMatters ) ;

	var winner = await game.run(
		board => exports.networkPlay( networks[ 0 ] , board ) ,
		board => exports.networkPlay( networks[ 1 ] , board )
	) ;

	if ( ! networks[ 0 ].metadata.trialData ) { networks[ 0 ].metadata.trialData = {} ; }
	if ( ! networks[ 1 ].metadata.trialData ) { networks[ 1 ].metadata.trialData = {} ; }
	
	//console.log( game.reason + '\n' + game.boardStr() ) ;
	if ( exports.reason ) { console.log( game.reason ) ; }

	// Harder penalty for losing because of an illegal move
	if ( game.reason === 'illegalMove' ) {
		if ( winner > 0 ) {
			networks[ 0 ].metadata.trialData.illWin = ( networks[ 0 ].metadata.trialData.illWin || 0 ) + 1 ;
			networks[ 1 ].metadata.trialData.illLose = ( networks[ 1 ].metadata.trialData.illLose || 0 ) + 1 ;
			return [ exports.winnerScore , exports.illegalMoveScore ] ;
		}
		else {
			networks[ 0 ].metadata.trialData.illLose = ( networks[ 0 ].metadata.trialData.illLose || 0 ) + 1 ;
			networks[ 1 ].metadata.trialData.illWin = ( networks[ 1 ].metadata.trialData.illWin || 0 ) + 1 ;
			return [ exports.illegalMoveScore , exports.winnerScore ] ;
		}
	}

	if ( winner > 0 ) {
		networks[ 0 ].metadata.trialData.win = ( networks[ 0 ].metadata.trialData.win || 0 ) + 1 ;
		networks[ 1 ].metadata.trialData.lose = ( networks[ 1 ].metadata.trialData.lose || 0 ) + 1 ;
		return [ exports.winnerScore , exports.loserScore ] ;
	}
	else if ( winner < 0 ) {
		networks[ 0 ].metadata.trialData.lose = ( networks[ 0 ].metadata.trialData.lose || 0 ) + 1 ;
		networks[ 1 ].metadata.trialData.win = ( networks[ 1 ].metadata.trialData.win || 0 ) + 1 ;
		return [ exports.loserScore , exports.winnerScore ] ;
	}
	else {
		networks[ 0 ].metadata.trialData.draw = ( networks[ 0 ].metadata.trialData.draw || 0 ) + 1 ;
		networks[ 1 ].metadata.trialData.draw = ( networks[ 1 ].metadata.trialData.draw || 0 ) + 1 ;
		return [ exports.drawScore , exports.drawScore ] ;
	}
} ;



exports.trial = async ( network , orderMatters ) => {
	var game = new TicTacToe( ! orderMatters ) ;

	var winner = await game.run(
		board => exports.networkPlay( network , board ) ,
		board => exports.randomPlay( board )
	) ;

	if ( ! network.metadata.trialData ) { network.metadata.trialData = {} ; }

	//console.log( game.reason + '\n' + game.boardStr() ) ;
	if ( exports.reason ) { console.log( game.reason ) ; }

	// Harder penalty for losing because of an illegal move
	if ( game.reason === 'illegalMove' ) {
		if ( winner > 0 ) {
			network.metadata.trialData.illWin = ( network.metadata.trialData.illWin || 0 ) + 1 ;
			return exports.winnerScore ;
		}
		else {
			network.metadata.trialData.illLose = ( network.metadata.trialData.illLose || 0 ) + 1 ;
			return exports.illegalMoveScore ;
		}
	}

	if ( winner > 0 ) {
		network.metadata.trialData.win = ( network.metadata.trialData.win || 0 ) + 1 ;
		return exports.winnerScore ;
	}
	else if ( winner < 0 ) {
		network.metadata.trialData.lose = ( network.metadata.trialData.lose || 0 ) + 1 ;
		return exports.loserScore ;
	}
	else {
		network.metadata.trialData.draw = ( network.metadata.trialData.draw || 0 ) + 1 ;
		return exports.drawScore ;
	}
} ;

