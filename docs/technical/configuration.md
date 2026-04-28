# Configuration

## Tooling

- Build tool: Vite
- UI library: React
- Styling: Tailwind CSS (via Vite plugin)
- Linting: ESLint

## NPM scripts

- `npm run dev`: start development server.
- `npm run build`: create production build.
- `npm run preview`: preview production build.
- `npm run lint`: run lint checks.
- `npm run test:fixtures`: regenerate SSD/ICD test fixtures.
- `npm run test`: run Cucumber automated tests (automatically runs `pretest`).
- `npm run test:watch`: run Cucumber tests in watch mode.
- `npm run pretest`: regenerate fixtures in temporary directory before tests.

## Dependencies used by core features

- `fast-xml-parser`: parse SSD/ICD XML files.
- `jspdf` + `jspdf-autotable`: PDF export.
- `exceljs`: Excel export.


## CI pipeline

- GitHub Actions workflow: `.github/workflows/ci-tests.yml`.
- Trigger: every `push` and every `pull_request` update.
- Steps: `npm ci`, `npm run test`, `npm run lint`, `npm run build`.


## BDD feature coverage

- Gherkin features are stored in `tests/features/`.
- Executable step definitions are implemented in `tests/features/steps/scl.steps.js`.
