
## First give each neuron a coordinate

Input neurons are simply at x=0 and y=input-index.
For other neurons, they are computed in the same order as the feed-forward order.
Each neuron is placed at the same y than its input and a x+1 of its input.
By the way most neurons have multiple inputs, so the coordinate is the average weighted by the absolute synapse weight.
So neurons tightly connected tend to be close.

Finally a sort of position collision will force neurons to be repelled, so they do not occupy the same place.



## Visualization

Use svg-kit to create an SVG/Canvas output, each neuron is a disc, connections are line between neurons.
Synapse weight are printed on connection, neuron bias and output value is printed around the neuron.
Connection lines are broader when the signal is stronger (absolute value of input x synapse weight),
neuron discs are larger when its absolute output value is greater.

Activation function can be coded using a color for the neuron, or the function graph inside the disc.
We can also vizualize back-propagation.

