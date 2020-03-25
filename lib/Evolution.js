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



const Mutation = require( './Mutation.js' ) ;



/*
	Sort of genetic algorithm without gene.
	Inspired by NEAT:
	http://nn.cs.utexas.edu/downloads/papers/stanley.ec02.pdf
	
	So this algorithm should work this way:
		* Should start with a minimal network
			* Only one connection between the input and output layer
			* OR one hidden neuron connected (upstream) to one input and connected (downstream) to one output
		* Concurrently test all networks and give them a score
		* Select the best
		* Mutation: among the best, clone some of them and mutate them:
			* Change randomly some synapse weights and bias
			* Randomly remove a connection (synapse)
				* Better chance to remove it if the synapse is rarely used: if its excitation (input x weight)
				  is closed to zero most of time
			* Randomly remove a neuron
				* Better chance if its output signal is most of time closed to zero, even more chance there
				  isn't any downstream path
			* Randomly add a neuron with a unique ID (probably an auto-increment)
				* The unique ID is used for crossing over networks
			* Randomly add a connection (synapse) that doesn't violate feed-forward processing
				* Better chance if two neurons activate at the same time, it is said that they should connect
		* Crossover/breed networks: among the best, create networks that are the sum/average of 2 networks
			* Create a topology that have all neurons and connections, it's easy since all neurons have an ID,
			  and a connection can be expressed as a unique from-to combination
			* When both network have the same neuron (e.g.: a neuron with the same ID), the bias is set randomly between both value
			* When both network have the same connection, the weight of the connection is set randomly between both value
			* There is also a chance that all weight+bias of a neuron comes from only one parent, to enforce a kind of
			  specialization of each neuron?
			* Crossed networks should be preserved, this kind of innovation is not effective immediately,
			  perhaps create “Islands” for them
		* “Islands” are isolated ecosystem, only networks of the same island are put in concurrency
			* “Islands” are randomly reunited, the chance for a merge is greater when for every unmerged generation
*/

/*
	Mandatory options:
		* createNetworkFn: a function to create a new network
		* testFn: the function that test an individual, should return a score (fitness)
	
	Other options:
		* population: the starting population, if not set or not enough individual, at some point it will use createNetworkFn()
		  to add more
		* populationSize: the number of individuals we want in the population (default: 100)
		* versus: default to 0, if set to a positive integer, the testFn needs many individuals to compete versus each other,
		  e.g. for a two players game, set versus to 1
		* testCount: default to 1, if set to a positive integer, the number of time the test should be done per round (epoch/gen),
		  it is useful when versus is set, to make multiple matchup between different individuals (so the second best could not
		  disappear because it loses vs the best)
		* mutation: an instance of Mutation
		* generation: default to 0, used when resuming
*/
function Evolution( options = {} ) {
	this.population = options.population || [] ;
	this.populationSize = options.populationSize || 100 ;
	this.createNetworkFn = options.createNetworkFn ;

	this.testFn = options.testFn ;
	this.testCount = options.testCount || 1 ;
	this.versus = options.versus || 0 ;

	this.mutation = ( options.mutation instanceof Mutation ) ? options.mutation : new Mutation( options.mutation ) ;

	this.generation = options.generation || 0 ;
}

module.exports = Evolution ;



Evolution.prototype.init = function() {
	while ( this.population.length < this.populationSize ) {
		this.population.push( this.createNetworkFn() ) ;
	}
} ;



Evolution.prototype.runNextGeneration = function() {
	var count , network ;

	this.generation ++ ;

	for ( network of this.population ) {
		network.metadata.fitness = 0 ;
	}
	
	count = this.testCount ;

	if ( this.versus ) {
	}
	else {
		while ( count -- ) {
			for ( network of this.population ) {
				network.metadata.fitness += this.testFn( network ) ;
			}
		}
	}
} ;

