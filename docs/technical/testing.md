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
- Fixtures: committed XML and XSD files under `tests/fixtures/`.

## Test structure

- `tests/features/*.feature`: Gherkin scenarios.
- `tests/features/steps/scl.steps.js`: step definitions and assertions.
- `tests/fixtures/`: committed fixture files and the fixture path helper.
- `tests/fixtures/fixturePaths.js`: cwd-agnostic resolution of fixture files used by Cucumber steps.

## Commands

- `npm run test`: run all Cucumber scenarios.
- `npm run test:watch`: run Cucumber in watch mode during development.
- `npm run test:bdd`: alias for the Cucumber test run.
- `npm run test:bdd:watch`: alias for the Cucumber watch mode.

## Update process on each code change

1. Update code and comments.
2. If behavior changes, update committed fixtures when the test data must change.
3. Update Cucumber scenarios and/or step assertions.
4. Run `npm run test` and `npm run lint`.
5. Update technical documentation if test scope changed.
