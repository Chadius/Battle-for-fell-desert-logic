# Coordinate Math

A lot of this coordinate math is taken from [Red Blob Games](www.redblobgames.com/grids/hexagons/)

Maps are drawn with hexagonal tiles, where the pointy sides are on the top and bottom.
This makes horizontal movement straightforward at the cost of adding diagonal movement for vertical.
We use non-negative coordinates, starting with `(0, 0)` in the upper left corner.

Given a coordinate, you can move in 1 of 6 directions:

- left
- right
- up left
- up right
- down left
- down right

## Offset Coordinates

Coordinates are stored as `(row, col)`.

`col` denotes the horizontal distance from the origin.

- left = `col - 1`
- right = `col + 1`

`row` is the vertical distance from the origin.
In an offset coordinate system, even number rows are shifted left horizontally by half a tile width.
This means you will move in a zigzag pattern when moving vertically.
It also means changing coordinates relies on the row you are on.

If the row is even, changing col alone will move you along the up left to down right diagonal:

- up right: `(row - 1, col)`
- down right: `(row + 1, col)`
- up left: `(row - 1, col - 1)`
- down left: `(row + 1, col - 1)`

If the row is odd, changing col alone will move you to the up right to down left diagonal:

- up left: `(row - 1, col)`
- down left: `(row + 1, col)`
- up right: `(row - 1, col + 1)`
- down right: `(row + 1, col + 1)`

The good news is that this produces rectangular maps which are easier to abstract in a strategy game.
Bad news is it makes the math more difficult. Best to convert the coordinates into another coordinate system.

## Cubic Coordinates

You can represent a cubic coordinate as a triplet of numbers (q, r, s) that sum to zero.
This allows for easy manipulation and conversion between different coordinate systems.

Increasing q moves from left to right.
Increasing r moves from up left to down right.
Increasing s moves from up right to down left.

### Axial Coordinates

You can always convert a Cubic to a Hexagonal coordinate by ignoring s. Because q + r + s = 0,
q and r is enough to figure out s.

It's very easy to manipulate axial and cubic coordinates,
so many calculations will convert from offset to cubic coordinates,
do the math, and then convert back to offset coordinates.

## Rounding Coordinates

www.redblobgames.com/grids/hexagons/#rounding

When you get a cube coordinate, it may have fractional coordinates. You want to round it to the nearest hex coordinate.
Take the fractional parts of each coordinate and rounding them individually.
However, we have to enforce that the rounded q, r, and s still sum up to 0.

To deal with this, we will ignore the coordinate component that changed the most and set it to other two components.
For example, if q's difference `abs(rounded_q - fractional_q)` is larger than both `abs(rounded_r - fractional_r)`
and `abs(rounded_s - fractional_s)`, we will set `rounded_q = -r -s`.

In a Hex Coordinate system, we don't care about s, so if s has the greatest difference, we'll use
`(rounded_q, rounded_r)` as our coordinates.

## Drawing Lines

You have two coordinates, and you'd like to draw a line connecting them. We can use Linear Interpolation and rounding to
get coordinates.

Convert the start and end points to Axial coordinates.
Now we can use Linear Interpolation to get a line equation along the q, r, and s components.
Each will be fractional, so we will Round each Coordinate.

### Perpendicular Directions

We can't make perfect perpendicular lines as we're on a Hex grid, but we can approximate them.

The dot product between perpendicular lines is 0.
We'll get the difference between start and end points of the line, `(dq, dr)`.

With a Hexagonal coordinate system, we have 6 directions to look at. For each `(q, r)` we can get the dot product:
`abs(q * dq + r * dr)`

We want the two directions with the smallest dot product.

#### Example

For example, let's draw a line from axial coordinates `(2, 3)` to `(4, 3)`. This is a horizontal line from left to
right, 3 coordinates
long.

We'll get the difference between start and end points of the line, `(dq, dr)`.
`(dq, dr) = (2, 0)`

With a Hexagonal coordinate system, we have 6 directions to look at. For each `(q, r)` we can get the dot product:

- right: `(1, 0) => 1 * 2 + 0 * 0 = 2`
- up right: `(1, -1) => 1 * 2 + -1 * 0 = 2`
- up left: `(0, -1) => 0 * 2 + -1 * 0 = 0`
- left: `(-1, 0) => -1 * 2 + 0 * 0 = -2`
- down left: `(-1, 1) => -1 * 2 + 1 * 0 = -2`
- down right: `(0, 1) => 0 * 2 + 1 * 0 = 0`

The 2 closest directions to 0 are up left and down right. So we know the diagonal line is from `(0, -1)` to `(0, 1)`.

### Line Thickness

When drawing a line, we may add a width. The width is the number of hexes to add on each side of the line.
For example, a width of 1 means we add 1 hex on each side of the line.
This creates a thicker line that is 3 hexes wide.

To calculate the involved hexes, we will use the perpendicular directions to the line.
For each hex involved on the centerline, we'll expand in the perpendicular directions to add more hexes until we are at
the desired thickness. Make sure to deduplicate hexes when adding them.
