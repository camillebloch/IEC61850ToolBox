# IEC61850ToolBox

IEC61850ToolBox is a web application used to compare an IEC 61850 system specification (`.ssd`) with an IED capability file (`.icd`) and identify structural compliance gaps.

## Quick start

```bash
npm install
npm run dev
```

Then open the local URL displayed by Vite in your browser.

For the SCL patch runner, configure the backend endpoint in a local `.env` file:

```bash
```

Then set:

```bash
VITE_PATCH_API_URL=http://localhost:8000
```

A Render-hosted backend can also be used instead of the local Python service.

## Deployment

The application is deployed to GitHub Pages by the
[Deploy to GitHub Pages workflow](.github/workflows/deploy-pages.yml) after
changes are pushed to `main`. It is available at:

https://milka34Fr.github.io/IEC61850ToolBox/

The workflow can also be started manually from the GitHub Actions tab.

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
- Run Cucumber tests: `npm run test`
- Watch Cucumber tests: `npm run test:watch`
- Run Cucumber tests: `npm run test:bdd`
- Watch Cucumber tests: `npm run test:bdd:watch`

Fixture XML files are committed under `tests/fixtures/` so test runs are deterministic across environments.
