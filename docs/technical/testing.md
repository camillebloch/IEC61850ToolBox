# Testing Strategy

## Objectives

The project now uses Cucumber scenarios as the single automated test entry point.
The strategy combines:

- **behavior-driven tests** for parser and comparison behavior,
- **non-regression tests** based on SSD/ICD fixtures.

When code changes, test fixtures and Cucumber assertions must be updated in the same pull request.

## Test stack

- Runtime: Cucumber (`@cucumber/cucumber`)
- Assertion library: native `node:assert/strict`
- Fixture generation: `tests/fixtures/generate-fixtures.mjs` (writes files to OS temporary directory).

## Test structure

- `tests/features/*.feature`: Gherkin scenarios.
- `tests/features/steps/scl.steps.js`: step definitions and assertions.
- `tests/fixtures/`: fixture generator and fixture path helper.
- `tests/helpers/ensureFixtures.js`: fixture bootstrap used by Cucumber hooks.
- Generated fixture files: stored in temporary directory `iec61850toolbox-test-fixtures` (not committed to Git).

## Commands

- `npm run test:fixtures`: regenerate SSD/ICD fixtures used by tests.
- `npm run test`: run all Cucumber scenarios.
- `npm run test:watch`: run Cucumber in watch mode during development.

## Update process on each code change

1. Update code and comments.
2. If behavior changes, update fixture generator and regenerate fixtures.
3. Update Cucumber scenarios and/or step assertions.
4. Run `npm run test` and `npm run lint`.
5. Update technical documentation if test scope changed.
