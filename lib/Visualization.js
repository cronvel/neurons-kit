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



const svgKit = require( 'svg-kit' ) ;



function Visualization( network , options = {} ) {
	this.network = network ;
	this.unitDataMap = new Map() ;

	this.xMax = 0 ;
	this.yMax = 0 ;
}

module.exports = Visualization ;



Visualization.prototype.computeUnitPosition = function() {
	var y ,
		deltaX = 3 ,
		deltaY = 2 ,
		inputYMax = ( this.network.inputUnits.length - 1 ) * deltaY ,
		hiddenXMax = 0 ;

	this.xMax = 0 ;
	this.yMax = inputYMax ;

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
		this.yMax = Math.max( this.yMax , data.y ) ;
	}

	// Used to scale hidden layer along Y-axis
	let pseudoColumns = Math.round( hiddenXMax / deltaX ) ;

	// Here we need to use collision detection to move units away

	y = 0 ;
	this.xMax = hiddenXMax + deltaX ;

	for ( let unit of this.network.outputUnits ) {
		let data = this.unitDataMap.get( unit ) ;
		if ( ! data ) { this.unitDataMap.set( unit , data = {} ) ; }
		data.x = this.xMax ;
		data.y = y ;
		this.yMax = Math.max( this.yMax , data.y ) ;
		y += deltaY ;
	}
} ;



// Linear until 1, then grow like the square-root (shifted so the derivated is continuous).
const magnitude = v => {
	v = Math.abs( v ) ;
	if ( v > 1 ) { v = 0.5 + Math.sqrt( v - 0.75 ) ; }
	return v ;
} ;



const VG_MARGIN = 10 ;
const VG_SCALE = 50 ;
const VG_STROKE_WIDTH = 2 ;
const VG_UNIT_SIZE = 10 ;
const VG_CONNECTION_THICKNESS = 5 ;
const VG_INPUT_OUTPUT_LENGTH = 50 ;



Visualization.prototype.toVg = function() {
	this.computeUnitPosition() ;

	var margin = VG_UNIT_SIZE + VG_STROKE_WIDTH + VG_MARGIN ;
	var viewBox = {
		xmin: - VG_INPUT_OUTPUT_LENGTH - margin ,
		ymin: - VG_INPUT_OUTPUT_LENGTH - margin ,
		xmax: this.xMax * VG_SCALE + VG_INPUT_OUTPUT_LENGTH + margin ,
		ymax: this.yMax * VG_SCALE + VG_INPUT_OUTPUT_LENGTH + margin
	} ;

	var vg = new svgKit.VG( { viewBox } ) ;

	// Background
	var vgRect = new svgKit.VGRect( {
		x: vg.viewBox.x ,
		y: vg.viewBox.y ,
		width: vg.viewBox.width ,
		height: vg.viewBox.height ,
		style: { fill: '#fff' }
	} ) ;
	vg.addEntity( vgRect ) ;

	// Display connections
	for ( let [ unit , data ] of this.unitDataMap ) {
		//console.log( "\n\n##########\n\nunit:" , unit , "\n\ndata:" , data ) ;
		if ( ! unit.synapses ) { continue ; }

		for ( let synapse of unit.synapses ) {
			let inputData = this.unitDataMap.get( synapse.input ) ;
			let points = [
				{
					x: inputData.x * VG_SCALE ,
					y: inputData.y * VG_SCALE
				} ,
				{
					x: data.x * VG_SCALE ,
					y: data.y * VG_SCALE
				}
			] ;
			let thickness = Math.max( 0.5 , magnitude( synapse.input.signal ) * VG_CONNECTION_THICKNESS ) ;
			let vgLine = new svgKit.VGPolyline( {
				points ,
				style: { stroke: '#d97' , strokeWidth: thickness }
			} ) ;
			vg.addEntity( vgLine ) ;
		}
	}

	// Display input magnitude
	for ( let unit of this.network.inputUnits ) {
		let data = this.unitDataMap.get( unit ) ;
		let thickness = Math.max( 0.5 , magnitude( unit.signal ) * VG_CONNECTION_THICKNESS ) ;
		let points = [
			{
				x: data.x * VG_SCALE ,
				y: data.y * VG_SCALE
			} ,
			{
				x: data.x * VG_SCALE - VG_INPUT_OUTPUT_LENGTH ,
				y: data.y * VG_SCALE
			}
		] ;
		let vgLine = new svgKit.VGPolyline( {
			points ,
			style: { stroke: '#d97' , strokeWidth: thickness }
		} ) ;
		vg.addEntity( vgLine ) ;
	}

	// Display output magnitude
	for ( let unit of this.network.outputUnits ) {
		let data = this.unitDataMap.get( unit ) ;
		let thickness = Math.max( 0.5 , magnitude( unit.signal ) * VG_CONNECTION_THICKNESS ) ;
		let points = [
			{
				x: data.x * VG_SCALE ,
				y: data.y * VG_SCALE
			} ,
			{
				x: data.x * VG_SCALE + VG_INPUT_OUTPUT_LENGTH ,
				y: data.y * VG_SCALE
			}
		] ;
		let vgLine = new svgKit.VGPolyline( {
			points ,
			style: { stroke: '#d97' , strokeWidth: thickness }
		} ) ;
		vg.addEntity( vgLine ) ;
	}

	// Display units
	for ( let [ unit , data ] of this.unitDataMap ) {
		let vgEllipse = new svgKit.VGEllipse( {
			x: data.x * VG_SCALE ,
			y: data.y * VG_SCALE ,
			r: VG_UNIT_SIZE ,
			style: { fill: '#7d9' , stroke: '#000' , strokeWidth: VG_STROKE_WIDTH }
		} ) ;
		vg.addEntity( vgEllipse ) ;
	}

    return vg ;
} ;

