# Cucumber Step Definitions

This folder contains executable Cucumber step definitions used by the test suite.

## Implemented mapping

- `Given the generated fixture "<file>"` → load generated XML from the temporary fixture directory.
- `When I parse the SCL XML content` → call `parseSCL`.
- `When I compare the specification model with the real model` → call `compareIED`.
- `Then ...` assertions → validate parser/comparison output.

## Execution notes

- Fixtures are generated automatically in Cucumber hooks through `tests/helpers/ensureFixtures.js`.
- Run the suite with `npm run test`.
