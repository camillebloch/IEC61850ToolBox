# Cucumber Step Definitions (Planned)

This folder is reserved for Cucumber step definitions.

## Planned mapping

- `Given the generated fixture "<file>"` → load generated XML from the temporary fixture directory.
- `When I parse the SCL XML content` → call `parseSCL`.
- `When I compare the specification model with the real model` → call `compareIED`.
- `Then ...` assertions → validate parser/comparison output.

## Why this is not active yet

Cucumber runtime package (`@cucumber/cucumber`) must be installed to execute `.feature` files.
In restricted environments where npm registry access is blocked, this folder acts as a migration blueprint.
