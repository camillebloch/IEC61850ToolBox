# IEC61850ToolBox

IEC61850ToolBox is a web application used to compare an IEC 61850 system specification (`.ssd`) with an IED capability file (`.icd`) and identify structural compliance gaps.

## Quick start

```bash
npm install
npm run dev
```

Then open the local URL displayed by Vite in your browser.

## Documentation

- User documentation:
  - [Installation guide](docs/user/installation.md)
  - [User guide](docs/user/guide.md)
- Technical documentation:
  - [Architecture](docs/technical/architecture.md)
  - [Configuration](docs/technical/configuration.md)
  - [Data model](docs/technical/data-model.md)
  - [API and core modules](docs/technical/api.md)
  - [Testing strategy](docs/technical/testing.md)
- Project history:
  - [Changelog](CHANGELOG.md)

## Development

- Lint: `npm run lint`
- Production build: `npm run build`

## Run tests in VS Code

1. Open the project folder in VS Code.
2. Open the integrated terminal (`Terminal > New Terminal`).
3. Run `npm install` once to install dependencies.
4. Run `npm run test` to execute all tests once.
5. Run `npm run test:watch` during development for automatic re-run.
6. Optional: run `npm run test:fixtures` after changing test scenarios.

Generated fixture XML files are written to your OS temporary directory (`iec61850toolbox-test-fixtures`) and are not tracked in Git.

You can also use VS Code NPM Scripts view (Explorer > NPM Scripts) to launch `test`, `test:watch`, and `test:fixtures` without typing commands.


## Cucumber integration in VS Code

The repository now includes Gherkin feature drafts in `tests/features/*.feature` for a Cucumber migration preview.

1. Install Cucumber as a dev dependency: `npm install -D @cucumber/cucumber`.
2. Add scripts in `package.json`:
   - `"test:cucumber": "cucumber-js tests/features/**/*.feature"`
   - `"test:cucumber:watch": "cucumber-js --watch tests/features/**/*.feature"`
3. Install VS Code extension **Cucumber (Gherkin) Full Support** (`alexkrechik.cucumberautocomplete`).
4. Configure `.vscode/settings.json`:
   - `"cucumberautocomplete.steps": ["tests/features/steps/**/*.js"]`
   - `"cucumberautocomplete.syncfeatures": "tests/features/*.feature"`
5. Implement JS step definitions in `tests/features/steps/` and run `npm run test:cucumber`.

Current CI and local validation still use the native Node.js test runner until `@cucumber/cucumber` can be installed.
