@SPEC.md
See `SPEC.md` for the full technical specification, current capabilities, known gaps, and the
phased implementation plan.

# Overview

This project will contain the logic needed to play a turn based strategy game called The Battle of Fell Desert.

This is the new version of the previous project located at https://github.com/Chadius/Torrin-TBS .
The previous version was attached to a graphics engine that was ultimately inadequate to develop a game.
This project hopes to contain the logic that will allow to be plugged into any game engine.

This program is being written by one person in TypeScript.

We use Test Driven Development to write new features.

Avoid adding new libraries, always ask if a package should be added.

Code changes need to be very confined and relatively minimal.

## TypeScript conventions

Filenames are written in camelCase, where the first letter is lower case and the beginning of words are upper.

Avoid the `any` type. Create a new type to support the argument. Export the type if multiple files will use it.

Prefer undefined over null, and use `==` when comparing to undefined. If you need to make a difference between them,
add a boolean value, so it is unnecessary.
For example, you may try to search for applicable targets. One way to indicate "haven't looked yet" versus "looked but
All targets must be in range"
is to add a boolean value, beganSearch, and set it to false. Then we know no targets were in range if beganSearch is
true and the searchResults are still undefined.

Use Named Exports.

## Types and Interfaces

Use PascalCase to name them. The first letter of each word should be capitalized.

Types should be used if we expect a future Union of different Types. It is also used for simple concepts.

Interfaces should be used by default, especially if the object has nested fields.

If we're creating a new type based on an existing type (for example, a Serialized type of object), it's
preferred to use a Type that Inherits from the Interface and removes/replaces fields.

## Folder conventions

`src` - This is the top level of our application files.

## Error handling

Throw errors that indicate the calling non-private function. For example, the InBattleSquaddieManager relies on
components that may be
undefined. If you call a function that relies on a component that is undefined, the function will throw an error.

InBattleSquaddieManager.throwIfInBattleSquaddieCollectionIsUndefined takes the name of the calling function so it's
easier
for me to debug which function ultimately triggered the error.

## Variable naming

Use verbose names in camelCase when necessary. Avoid abbreviations except for ID. If the meaning is implied you don't
need a full description.

For example, `OutOfBattleSquaddieAttributeSheet.id` refers to the OutOfBattleSquaddieAttributeSheet's id field, so the
name is clear.

But when InBattleSquaddie needs to know about it, we use `attributeSheetId` since there are other ID objects
like `InBattleSquaddie.id`, so this is used to disambiguate.

## Documentation

The test descriptions and variable/function names should be used to document as much as possible.

Avoid trivial comments, like adding "Given/When/Then" in test code.

SonarQube has a warning when a function exceeds a complexity of 15. That's a good indicator that a function should be
broken into several helper functions.

## Reducing code complexity

If an object has multiple optional fields and independent work can be done on each, use multiple helper functions
instead of multiple if statements. This reduces complexity and makes it easier to read.

For example, use serialize() and deserialize() to convert components. If the service or class handles multiple objects
(like the InBattleSquaddieManager) then you can disambiguate the component you are serializing
(like serializeInBattleSquaddieCollection)

# Adding New Interfaces

When you add a new interface or subsystem, it's important to define levels of abstraction.

Data Object → Collection → Manager

These levels allow us to swap out components without breaking function calls and interfaces.

Functions should either:

- Create and return a new object.
- Get some information without changing the underlying object.
- Set/Change a field (throwing an error if it is impossible).

We should avoid functions that Get and Set. This will make the code easier to understand and avoid functions with
unwanted side effects.

You can include all the files in a single folder related to the domain.

An example can be found in the `src/squaddieItem` folder

- Data Object: SquaddieItem
- Collection: SquaddieItemCollection
- Manager: SquaddieItemManager

## Data Object

OutOfBattleSquaddieAttributeSheet in outOfBattleSquaddieAttributeSheet.ts

This is the single object that represents one example of a concept.
For example, each Out of Battle Squaddie has a different Attribute Sheet.
Data Objects know how to handle themselves, and are responsible for deep cloning themselves if needed.
They usually have some kind of unique id.
A stateless service object manages them. This makes them easy to serialize as pure data objects.

Data Objects should be immutable. If a function needs to change it, it should clone the object, change the clone,
and return the clone. The clone should be a deep copy with no nested references to the original.

## Collection

OutOfBattleSquaddieAttributeSheetCollection in outOfBattleSquaddieAttributeSheetCollection.ts

This handles multiple Data Objects, performing basic CRUD operations and managing any related fields.

For example, the OutOfBattleSquaddieAttributeSheetCollection can save and read OutOfBattleSquaddieAttributeSheet
objects.
The OutOfBattleSquaddieManager can ask it to only keep a subset of attribute sheets, and the collection is responsible
for the actual deletion.
This is the equivalent of an ORM or a database table, but I don't want to deal with databases in this project.

A stateless server object manages them so the logic and the data can be cleanly separated.

## Manager

OutOfBattleSquaddieManager in outOfBattleSquaddieManager.ts
InBattleSquaddieManager in inBattleSquaddieManager.ts

This is the front end interface other systems will interact with.
This is an instance of a class that accepts collections relevant to its domain, while also taking other managers that
lie outside.
OutOfBattleSquaddieManager manages anything related to OutOfBattleSquaddie domain, like
OutOfBattleSquaddieAttributeSheet and OutOfBattleSquaddie.
InBattleSquaddieManager requires OutOfBattleSquaddie objects for its logic, so it uses a OutOfBattleSquaddieManager.
These classes are never expected to be serialized so they can have state.

They will throw errors if components are missing. This makes it easy to test only the needed subsystems.
For example, the InBattleSquaddieManager can let Squaddies use Items, so it needs to know about the SquaddieItemManager
objects while managing them.

# Engine

The Engine layer will interact with managers and is responsible for passing user input to the manager and will deliver
output to them.

For example, the MissionEngine is designed to pass actions, queue up results and wait for the mission to end.

# Test files

Test files use the extension `test.ts` . For example outOfBattleSquaddieAttributeSheet.test.ts is the test file for
outOfBattleSquaddieAttributeSheet.ts . All tests use the vitest library. Use `npm run test` to run the entire test
suite.

Use one `describe` block, usually with the name of the object/class under test. You can nest `describe` blocks within.

Try to avoid mocking objects if possible. I'd rather you make simple and specific examples of underlying objects
and make large test files. Mocked objects break when the functions change.

When writing a describe block, try to consolidate functions across the individual tests. Many tests have a slightly
different setup or action. Extract common describe-level functions to reuse the setup and reduce duplication and improve
readability. Some tests need to do some setup before acting. Move the action into a function and let the unit test call
that instead. This makes the tests more readable and focuses on the test's purpose.
