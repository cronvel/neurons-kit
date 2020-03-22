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
	Sort of genetic algorithm without gene, since coding a neural network have little sens.
	
	So this algorithm should work this way:
		* Concurrently test all network and give them a score
		* Select the best
		* Among the best, clone some of them and mutate them:
			* Change randomly some network weights
			* Remove some useless synapse, or whole neuron if its last synapse is removed
				* If a synapse is rarely used (most of time its excitation is closed to zero)
				* If the output signal is most of time closed to zero
			* Eventually add a synapse/neuron, if the network has not enough of them (how to detect that?)
				* If two neurons activate at the same time, it is said that they should connect
		* Cross 2 networks:
			* Clone the first network, create a training sample from the response of the second network
			* Train the clone with the training sample
			* Alternatively (since both network are probably structurally closed to each other at the begining),
				make the training sample have some of the first network response too
			* Crossing cost a lot of CPU, it should be used with care, probably only with the best of the best
*/

