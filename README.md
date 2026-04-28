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
