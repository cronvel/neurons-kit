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
const shuffleArray = require( 'array-kit' ).shuffle ;
//const arrayKit = require( 'array-kit' ) ;
//const string = require( 'string-kit' ) ;



exports.createNetwork = () => {
	var network = new nk.Network() ;

	network.setNetworkModel( {
		inputs: [ 'a' , 'b' ] ,
		outputs: [ 'r' ] ,
		unconnected: true ,
		outputActivation: 'hardSigmoid'
	} ) ;

	network.mutateAddNewConnection( new nk.Mutation() ) ;
	network.init() ;
	network.randomize() ;

	return network ;
} ;



exports.trial = async ( network ) => {
	var error = 0 ;

	var miniTrials = [
		() => error += Math.abs( network.process( [ 0 , 0 ] )[ 0 ] ) ** 2 ,
		() => error += Math.abs( network.process( [ 1 , 1 ] )[ 0 ] ) ** 2 ,
		() => error += Math.abs( 1 - network.process( [ 0 , 1 ] )[ 0 ] ) ** 2 ,
		() => error += Math.abs( 1 - network.process( [ 1 , 0 ] )[ 0 ] ) ** 2
	] ;

	shuffleArray( miniTrials ) ;

	for ( let miniTrial of miniTrials ) { miniTrial() ; }

	var fitness = 100 - 100 * Math.sqrt( error ) ;

	return fitness ;
} ;

