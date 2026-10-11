git show personal/gh-pages-schneider:index.html

# IEC61850ToolBox Publication Workflow for Schneider GitHub Pages

## 1. Purpose

This document describes the current workflow used to:

1. Develop `IEC61850ToolBox` in the personal GitHub repository.
2. Automatically generate a Schneider-specific static website after each update to `main`.
3. Publish the generated website to a dedicated branch.
4. Synchronize the source and generated website to Schneider GitHub Enterprise.
5. Serve the generated branch through Schneider GitHub Pages.

```text
Personal GitHub: main
        |
        | push to main
        v
Personal GitHub Actions
        |
        | npm ci
        | npm test
        | npm run build -- --mode schneider
        v
Personal GitHub: gh-pages-schneider
        |
        | controlled one-way synchronization
        v
Schneider GHES: gh-pages-schneider
        |
        | deploy from branch / root
        v
Schneider GitHub Pages
```

---

## 2. Repository addresses

### Personal GitHub repository

```text
https://github.com/milka34Fr/IEC61850ToolBox.git
```

### Schneider GitHub Enterprise repository

```text
https://github.schneider-electric.com/SESA160638/IEC61850ToolBox.git
```

### Schneider GitHub Pages site

```text
https://pages.github.schneider-electric.com/SESA160638/IEC61850ToolBox/
```

---

## 3. Branch roles

| Branch                 | Repository      | Purpose                                          |
| ---------------------- | --------------- | ------------------------------------------------ |
| `main`               | Personal GitHub | Development source and source of truth           |
| `gh-pages-schneider` | Personal GitHub | Automatically generated Schneider static website |
| `main`               | Schneider GHES  | Mirrored source code                             |
| `gh-pages-schneider` | Schneider GHES  | Static files served by Schneider GitHub Pages    |

The `gh-pages-schneider` branch is generated automatically and must not be edited manually.

---

## 4. Vite configuration

Use the Vite build mode to select the appropriate Pages base path.

The complete `vite.config.js` is:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  base:
    mode === 'schneider'
      ? '/SESA160638/IEC61850ToolBox/'
      : '/IEC61850ToolBox/',

  plugins: [
    react(),
    tailwindcss(),
  ],
}))
```

The two build modes behave as follows:

```text
npm run build
    -> /IEC61850ToolBox/

npm run build:schneider
    -> /SESA160638/IEC61850ToolBox/
```

The standard build remains suitable for the personal GitHub Pages site. The `schneider` mode produces asset paths for the Schneider Pages address and loads `.env.schneider`, which sets `VITE_PATCH_API_URL` to the public Render backend and limits `VITE_ENABLED_TOOLS` to `scl-patch-runner`. Other builds show all tools unless their own `VITE_ENABLED_TOOLS` is set. Build the Schneider site locally with `npm run build:schneider`; Vite embeds these settings in the generated client code in `dist`. This setting hides tools from the navigation; it does not remove their implementation from the client bundle.

---

## 5. Personal GitHub Actions workflow

Create the following file in the personal repository:

```text
.github/workflows/build-schneider-pages.yml
```

Use this workflow:

```yaml
name: Build Schneider Pages branch

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: build-schneider-pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Check out source
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Test project
        run: npm test -- --run

      - name: Build static site for Schneider Pages
        run: npm run build -- --mode schneider

      - name: Add Pages marker
        run: touch dist/.nojekyll

      - name: Publish generated site to gh-pages-schneider
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd dist
          git init
          git checkout -b gh-pages-schneider
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add --all
          git commit -m "Build Schneider Pages from ${GITHUB_SHA}"
          git remote add origin "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
          git push --force origin gh-pages-schneider
```

### Test step variants

If the project test script already runs non-interactively, use:

```yaml
- name: Test project
  run: npm test
```

If the project has no test script, remove the test step.

---

## 6. Personal repository permissions

In the personal GitHub repository, open:

```text
Settings > Actions > General > Workflow permissions
```

Select:

```text
Read and write permissions
```

This allows the workflow's `GITHUB_TOKEN` to create and replace `gh-pages-schneider`.

Ensure that branch rules do not prevent the workflow from force-updating this generated branch.

---

## 7. Commit the configuration

From the normal personal development checkout:

```bash
git add vite.config.js .github/workflows/build-schneider-pages.yml
git commit -m "Configure Schneider Pages publication"
git push origin main
```

A push to `main` starts the workflow automatically.

The workflow can also be started manually from:

```text
Actions > Build Schneider Pages branch > Run workflow
```

---

## 8. Generated branch content

After a successful workflow run, `gh-pages-schneider` must contain the generated files at its root:

```text
gh-pages-schneider
├── index.html
├── .nojekyll
└── assets/
    ├── *.js
    └── *.css
```

The generated branch must not contain the development source tree, including files such as:

```text
src/main.jsx
package.json
vite.config.js
```

The generated `index.html` should reference assets under:

```text
/SESA160638/IEC61850ToolBox/assets/
```

---

## 9. Local mirror configuration

Use a dedicated bare mirror:

```text
C:\GIT-Mirror\IEC61850ToolBox.git
```

### Create the mirror

If the mirror does not already exist:

```powershell
cd C:\GIT-Mirror
git clone --mirror https://github.com/milka34Fr/IEC61850ToolBox.git
cd IEC61850ToolBox.git
```

### Configure remotes

```bash
git remote rename origin personal
git remote add schneider https://github.schneider-electric.com/SESA160638/IEC61850ToolBox.git
```

Verify the remotes:

```bash
git remote -v
```

Expected configuration:

```text
personal   https://github.com/milka34Fr/IEC61850ToolBox.git (fetch)
personal   https://github.com/milka34Fr/IEC61850ToolBox.git (push)
schneider  https://github.schneider-electric.com/SESA160638/IEC61850ToolBox.git (fetch)
schneider  https://github.schneider-electric.com/SESA160638/IEC61850ToolBox.git (push)
```

---

## 10. Publish to Schneider GitHub Enterprise

Run the synchronization only after the personal GitHub Actions workflow has completed successfully.

Open the local mirror:

```powershell
cd C:\GIT-Mirror\IEC61850ToolBox.git
```

Fetch the latest personal branches:

```bash
git fetch --prune personal
```

Push the branches to Schneider:

```bash
git push schneider --all
```

Push the tags:

```bash
git push schneider --tags
```

This transfers both:

```text
main
gh-pages-schneider
```

Do not use:

```bash
git push --mirror schneider
```

---

## 11. Configure Schneider GitHub Pages

In the Schneider repository, open:

```text
Settings > Pages
```

Configure:

```text
Source:  Deploy from a branch
Branch:  gh-pages-schneider
Folder:  /(root)
```

Save the configuration.

The published site is:

```text
https://pages.github.schneider-electric.com/SESA160638/IEC61850ToolBox/
```

---

## 12. Routine publication process

### Automatic process on personal GitHub

Every push to personal `main` automatically:

1. Checks out the source.
2. Installs dependencies.
3. Runs the tests.
4. Builds the project in `schneider` mode.
5. Adds `.nojekyll` to the generated files.
6. Replaces `gh-pages-schneider` with the contents of `dist`.

### Controlled transfer to Schneider

After the personal workflow succeeds:

```bash
cd C:/GIT-Mirror/IEC61850ToolBox.git
git fetch --prune personal
git push schneider --all
git push schneider --tags
```

Schneider GitHub Pages then publishes the updated `gh-pages-schneider` branch.

---

## 13. Optional PowerShell publication script

Create:

```text
C:\GIT-Mirror\Publish-To-Schneider.ps1
```

with:

```powershell
$ErrorActionPreference = "Stop"

$MirrorPath = "C:\GIT-Mirror\IEC61850ToolBox.git"

# Remember where the script was started
$OriginalPath = Get-Location

try {
    Set-Location $MirrorPath

    Write-Host "Fetching from personal GitHub..."
    git fetch --prune personal
    if ($LASTEXITCODE -ne 0) { throw "Failed to fetch personal repository." }

    Write-Host "Refreshing Schneider state..."
    git fetch schneider
    if ($LASTEXITCODE -ne 0) { throw "Failed to fetch Schneider repository." }

    Write-Host "Publishing main..."
    git push schneider main
    if ($LASTEXITCODE -ne 0) { throw "Failed to publish main." }

    Write-Host "Publishing generated Schneider Pages..."
    git push --force-with-lease schneider gh-pages-schneider
    if ($LASTEXITCODE -ne 0) { throw "Failed to publish gh-pages-schneider." }

    Write-Host "Publishing tags..."
    git push schneider --tags
    if ($LASTEXITCODE -ne 0) { throw "Failed to publish tags." }

    Write-Host "Checking Schneider Pages branch..."
    git ls-remote --heads schneider gh-pages-schneider
    if ($LASTEXITCODE -ne 0) { throw "Failed to verify gh-pages-schneider." }

    Write-Host ""
    Write-Host "Publication completed successfully." -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "Publication failed: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    # Always return to the directory where the script was started
    Set-Location $OriginalPath

    Write-Host ""
    Write-Host "Returned to: $(Get-Location)"
}
```

Run the script with:

```powershell
powershell -ExecutionPolicy Bypass -File C:\GIT-Mirror\Publish-To-Schneider.ps1
```

---

## 14. Verification checklist

### Personal GitHub

- [ ] `main` contains the current source.
- [ ] The `Build Schneider Pages branch` workflow succeeds.
- [ ] `gh-pages-schneider` exists.
- [ ] `gh-pages-schneider/index.html` exists.
- [ ] `.nojekyll` exists.
- [ ] `assets/` contains compiled JavaScript and CSS.
- [ ] Asset paths contain `/SESA160638/IEC61850ToolBox/`.

### Schneider GitHub Enterprise

- [ ] `main` contains the current mirrored source.
- [ ] `gh-pages-schneider` exists.
- [ ] `gh-pages-schneider` contains only generated static files.
- [ ] Pages is configured for `gh-pages-schneider / (root)`.
- [ ] The website opens correctly.
- [ ] Browser Developer Tools show no missing JavaScript or CSS files.

---

## 15. Troubleshooting

### `npm ci` fails

Verify that `package-lock.json` exists and matches `package.json`.

If the project intentionally does not use an npm lockfile, change the workflow step to:

```yaml
- name: Install dependencies
  run: npm install
```

### Tests fail

Review the first failed test in the workflow log.

If tests run non-interactively without an additional argument, use:

```yaml
- name: Test project
  run: npm test
```

If the project contains no tests, remove the test step.

### The generated branch cannot be pushed

Confirm:

```text
Settings > Actions > General > Workflow permissions > Read and write permissions
```

Also check branch rules for `gh-pages-schneider`.

### Schneider Pages displays a blank page

Confirm that Schneider Pages uses:

```text
gh-pages-schneider / (root)
```

Confirm that `gh-pages-schneider` contains `index.html` and `assets/` at its root.

Confirm that generated asset paths begin with:

```text
/SESA160638/IEC61850ToolBox/
```

### Schneider rejects the push with `fetch first`

Fetch and inspect the destination branch:

```bash
git fetch schneider
git log --oneline gh-pages-schneider..schneider/gh-pages-schneider
```

If the destination contains only an obsolete generated deployment, replace it with:

```bash
git push --force-with-lease schneider gh-pages-schneider
```

Inspect `main` separately before replacing it:

```bash
git log --oneline main..schneider/main
```

### Schneider Actions reject mirrored workflows

The publication build runs on personal GitHub. Schneider Pages deploys directly from `gh-pages-schneider` and does not depend on the mirrored workflow running on Schneider GHES.

---

## 16. Security and governance

- Keep personal `main` as the source of truth.
- Treat `gh-pages-schneider` as generated content.
- Do not edit generated files manually.
- Do not store Schneider credentials in the personal GitHub repository.
- Review generated content before corporate publication when required.
- Confirm ownership, licensing, confidentiality, cybersecurity, and public-visibility requirements.
- Keep the personal-to-Schneider transfer controlled and auditable.
