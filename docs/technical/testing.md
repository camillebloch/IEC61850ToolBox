# Testing Strategy

## Objectives

The project now includes automated tests to continuously validate the existing comparison engine.
The strategy combines:

- **unit tests** for parser and comparison behavior,
- **non-regression tests** based on SSD/ICD fixtures.

When code changes, test fixtures and assertions must be updated in the same pull request.

## Test stack

- Runtime: native Node.js test runner (`node:test`)
- Assertion library: native `node:assert/strict`
- Fixture generation: `tests/fixtures/generate-fixtures.mjs` (writes files to OS temporary directory).

## Test structure

- `tests/parseSCL.test.js`: parser unit tests.
- `tests/compareIED.test.js`: comparison unit + non-regression tests.
- `tests/fixtures/`: fixture generator and fixture path helper.
- Generated fixture files: stored in temporary directory `iec61850toolbox-test-fixtures` (not committed to Git).

## Commands

- `npm run test:fixtures`: regenerate SSD/ICD fixtures used by tests.
- `npm run test`: run all automated tests.
- `npm run test:watch`: run tests in watch mode during development.

## Update process on each code change

1. Update code and comments.
2. If behavior changes, update fixture generator and regenerate fixtures.
3. Update unit/non-regression assertions.
4. Run `npm run test` and `npm run lint`.
5. Update technical documentation if test scope changed.


## BDD test style

Tests are written in a BDD structure (`describe`, `it`, `before`) using the native Node.js test API.
This keeps tests readable while remaining close to Jest conventions.

## Cucumber migration path for VS Code

Feature drafts are available in `tests/features/`.

If your environment allows installing additional npm packages, use this migration path:

1. Install Cucumber (`npm install -D @cucumber/cucumber`).
2. Add Cucumber scripts (`test:cucumber`, `test:cucumber:watch`).
3. Install VS Code extension `alexkrechik.cucumberautocomplete`.
4. Implement step definitions in `tests/features/steps/`.

