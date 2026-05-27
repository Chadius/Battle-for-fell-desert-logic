# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@SPEC.md
See `SPEC.md` for the full technical specification, current capabilities, known gaps, and the
phased implementation plan.

- Avoid `any` and `unknown` types unless we're accepting arbitrary data (like a file we hope is formatted JSON but we
  haven't validated yet). It's better to create a new type and export it.
- Interfaces are shown first at the top of the file. Derived interfaces like Schemas or Service objects lie below it.
- When throwing errors and printing error messages, add the name of the calling function that throws the error.
- Avoid abbreviations for variable names besides ID.
- Avoid complex functions and break them up into several helper functions.
- Avoid large test suites, break them into multiple smaller files.
- Squaddies use a combination of InBattleSquaddie and OutOfBattleSquaddie. Use
  `SquaddieIdConverterService.squaddieIdToKey({inBattleSquaddieId, outOfBattleSquaddieId})` to create and track unique
  identifiers.
- Follow the Data Object → Collection → Manager abstraction pattern. An example is SquaddieItem →
  SquaddieItemCollection → SquaddieItemManager.
