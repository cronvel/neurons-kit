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
	This is ONE sample, everytime the network does something, it should create a new sample.
*/
function ReinforcementSample( inputs , policy , expectedReward , instantReward = 0 , longTermReward = 0 ) {
	this.inputs = inputs ;	// The input array provided to the network
	this.policy = policy ;	// The chosen output neuron index, i.e. the one that triggered the response (a.k.a. the policy)
	this.expectedReward = expectedReward ;	// The value of the chosen output neuron, which forecast the reward
	this.instantReward = instantReward ;	// The instant reward given by the agent environment

	// The corrected reward, accounting for long-term reward, usually not set on instanciation but in the future
	this.longTermReward = longTermReward ;
}

module.exports = ReinforcementSample ;

