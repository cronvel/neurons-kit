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



/*
	An agent perform action in an environment.
	It contains methods and parameters to bridge the network to its environment, and defines hyper-parameters
	like the learning rate and the exploration value.

	Params:
		* network: a Network instance
		* createNetwork: a method for creating a network from scratch
		* exploration: for policy-based agent, it defines how much the agent explore, try new things, instead of always choosing
		  the policy that it thinks is the best
		* learningRate: affect back-propagation, how fast the network adapt itself
*/
function Agent( params = {} ) {
	this.network = params.network ;
	this.exploration = params.exploration || 0 ;
	this.learningRate = params.learningRate || 0 ;

	this.createNetworkFn = params.createNetwork ;
	this.receiveEnvironmentStateFn = params.receiveEnvironmentState ;

	this.inputs = null ;	// environment state translated to network input

	this.data = {} ;	// Userland data for the agent
}

module.exports = Agent ;



Agent.prototype.createNetwork = function() {
	this.network = this.createNetworkFn() ;
	return this.network ;
} ;



// The environment sends a (partial?) state to the agent, it has to translate it to network inputs
Agent.prototype.receiveEnvironmentState = function( state ) {
	this.inputs = this.receiveEnvironmentStateFn( state ) ;
} ;

