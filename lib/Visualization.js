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



var svgKit = null ;



function Visualization( network , options = {} ) {
	this.network = network ;
	this.unitDataMap = new Map() ;
}

module.exports = Visualization ;



try {
	// Peer dependency
	svgKit = require( 'svg-kit' ) ;
}
catch () {}



Visualization.prototype.computeUnitPosition = function() {
	var y ,
		deltaX = 3 ,
		deltaY = 2 ,
		inputYMax = ( this.network.inputUnits.length - 1 ) * deltaY ,
		hiddenXMax = 0 ;

	y = 0 ;

	for ( let unit of this.network.inputUnits ) {
		let data = this.unitDataMap.get( unit ) ;
		if ( ! data ) { this.unitDataMap.set( unit , data = {} ) ; }
		data.x = 0 ;
		data.y = y ;
		y += deltaY ;
	}

	for ( let unit of this.network.hiddenUnits ) {
		let data = this.unitDataMap.get( unit ) ;
		if ( ! data ) { this.unitDataMap.set( unit , data = {} ) ; }

		let weightSum = 0 , xMax = 0 , ySum = 0 ;

		for ( let synapse of unit.synapses ) {
			let inputData = this.unitDataMap.get( synapse.input ) ;
			let w = Math.abs( synapse.weight ) ;
			weightSum += w ;
			xMax = Math.max( xMax , inputData.x + deltaX ) ;
			ySum += inputData.y * w ;
		}

		hiddenXMax = Math.max( hiddenXMax , xMax ) ;

		data.x = xMax ;
		data.y = weightSum ? ySum / weightSum : inputYMax / 2 ;
	}

	// Used to scale hidden layer along Y-axis
	let pseudoColumns = Math.round( hiddenXMax / deltaX ) ;

	// Here we need to use collision detection to move units away

	y = 0 ;

	for ( let unit of this.network.outputUnits ) {
		let data = this.unitDataMap.get( unit ) ;
		if ( ! data ) { this.unitDataMap.set( unit , data = {} ) ; }
		data.x = hiddenXMax + deltaX ;
		data.y = y ;
		y += deltaY ;
	}
} ;



Visualization.prototype.toVg = function() {
	if ( ! svgKit ) {
		throw new Error( "Missing peer dependency 'svg-kit'" ) ;
	}

	this.computeUnitPosition() ;

	var vg = new svgKit.VG( { viewBox: { x: 0 , y: 0 , width: 500 , height: 500 } } ) ;

	for ( let unit of this.network.inputUnits ) {
		let data = this.unitDataMap.get( unit ) ;
		data.x = 0 ;
		data.y = y ;
		y += deltaY ;
	}

    return vg ;
} ;

