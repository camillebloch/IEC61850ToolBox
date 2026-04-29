# Cucumber Step Definitions

This folder contains executable Cucumber step definitions used by the test suite.

## Implemented mapping

- `Given the fixture file "<file>"` → load versioned XML from `tests/fixtures`.
- `When I parse the SCL XML content` → call `parseSCL`.
- `When I compare the specification model with the real model` → call `compareIED`.
- `Then ...` assertions → validate parser/comparison output.

## Execution notes

- Fixtures are committed in `tests/fixtures` and loaded directly by test steps.
- Run the suite with `npm run test`.
