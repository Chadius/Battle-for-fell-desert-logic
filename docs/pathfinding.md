# Pathfinding

We use A* Pathfinding to resolve searching through a map.
It is a good balance between performance and accuracy.

# General Purpose Pathfinder

Pathfinding can be used for more than maps, so this is a generic search algorithm.

Here are a few requirements of the input data:

## Graph

Any searchable graph has to answer these questions:

- What are the neighbors of a given node?
- How do I create a new path at the given node?
- How do extend a path with a given node?
- Can I move from one node to another given the cost between them and the total cost on this path?
- What's the movement cost to move through this node? (Must always be positive or A* will fail)
- Can you generate a unique value for this node?
- Can you compare these two nodes and tell me which one is greater (or the same?)
- Can I stop the path on this node?
- A post-processing callback once the main search ends.

## Stop Condition

This will look at the given node and determine if it should stop searching.
We will always stop if all nodes are exhausted and there are no Open nodes to investigate.
But the graph may be so large this will take too long (or the graph is actually infinite and this search will take
forever without a stop condition.)

## Start Point

This is a single node.

## Return value

This will return a path of the involved nodes, based on how the graph creates and extends paths.
If it fails to find a path, it returns undefined.

## Algorithm

Start with the starting node.

Now we can begin the main loop.

- Get the next node from the OpenSet.
- If the graph says we can stop searching at this node, post process with the path at this node.
- If the node is already visited, skip it.

That means we haven't found the stop condition yet, so we need to look at the node's neighbors.

- If we already visited the neighbor, skip it.
- Calculate the cost to move to the next neighbor.
- Ask the graph if we can move to the neighbor, given the cost to get to this node + the cost to move to the neighbor.

For each neighbor we can move to:

- Copy and extend the current path so it includes the neighbor and the neighbor's cost.
- Add the new neighbor path to the OpenSet.

At some point, we will either hit the graph's stop condition or empty the OpenSet.
Tell the graph to post process the path that satisfied the stop condition. Note there may not be a satisfying path.
The search algorithm will return that path after post processing.

### Visited nodes

This ensures that we don't visit the same node multiple times.
Once we finish working at a node, we mark it visited.

### OpenSet

This is a Priority Queue of all nodes we have yet to visit.
We sort them by the lowest cost node (using the graph's comparison function.) In case of a tie, we will sort by the node
we added first.

That's the trick to A*, we always look for the lowest costing node first. This will usually put us closer toward our
goal.

# Moving along a map

Squaddies want to move along a map. The map has a collection of coordinates, and may be occupied by other squaddies.
They may have impassable terrain. They may also have double movement cost.
Some terrain cannot be stopped on.

## Search Limits

Every search involving a squaddie has optional search conditions:

- Maximum movement cost (this will indicate if we can move to a neighbor)
- Minimum distance (some actions have a minimum range and will be removed in post processing)
- Skip over pits? (You cannot stop on a pit but some squaddies can move through them)
- Move through walls? (You cannot stop on a wall but some squaddies can move through them)
- Reduce Movement Costs to minimum? (Some squaddies treat all terrain as having the same movement cost)
- The squaddie's ID (Squaddies can move through their allies but not through their enemies)
- Can the squaddie stop on other squaddies?

## Node Operations

The map can be converted into a graph for the A* search algorithm.

- Neighboring nodes are the 6 coordinates 1 distance away from a given coordinate.

Search Limits determine if a squaddie can move to another coordinate:

- If it's a pit, the squaddie cannot by default
- If it's a wall, the squaddie cannot by default
- If it's an enemy squaddie, the squaddie cannot by default
- If it exceeds the movement cost, the squaddie cannot by default

The movement cost is determined by the terrain at the neighboring coordinate, optionally reduced by the search limits.

Paths are compared by their total cost.

Can I stop the path on this node?

- If the coordinate is a pit, the squaddie cannot stop on it.
- If the coordinate is a wall, the squaddie cannot stop on it.
- If there is another squaddie, the squaddie cannot stop on it.

Post Processing ensures:

- No paths end on unstoppable terrain.
- No paths end on another squaddie (unless the search limits allow this)
- No paths have less than the minimum distance

## Search Limit example: Targeting

We use A* to determine which targets are in range of an action.

- Maximum movement cost is the maximum range of the action.
- Minimum distance is the minimum range of the action.
- Can Skip over pits
- Cannot Move through walls (Maybe a sniper/satellite ability could in the future)
- Always reduces movement costs to the minimum cost (So now the maximum movement cost is also the maximum range)
- No squaddie id (can pass through everything)
- Can Stop on squaddies (it's targeting, it wants to aim at squaddie)
