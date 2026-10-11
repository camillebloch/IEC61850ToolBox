git show personal/gh-pages-schneider:index.html

# IEC61850ToolBox Publication Workflow for Schneider GitHub Pages

## 1. Purpose

This document describes the workflow used to:

1. Develop `IEC61850ToolBox` in the personal GitHub repository.
2. Automatically generate separate static websites for Schneider Pages and GitHub Pages after each update to `main`.
3. Publish each build to a dedicated branch.
4. Synchronize the source and matching website build to each destination repository.
5. Serve each generated branch through its respective Pages host.

```text
Personal GitHub: main
        |
        | push to main
        v
Personal GitHub Actions
        |
        | npm ci
        | build:schneider
        | build:schneider-ext
        v
Personal GitHub:
  gh-pages-schneider      (Schneider asset base)
  gh-pages-schneider-ext  (GitHub project-page asset base)
        |
        | controlled one-way synchronization
        +--------------------------+
        v                          v
Schneider GHES              Camille Bloch GitHub
gh-pages-schneider          gh-pages-schneider
        |                          |
        v                          v
Schneider Pages             camillebloch.github.io
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

### External GitHub Pages site

```text
https://camillebloch.github.io/IEC61850ToolBox/
```

---

## 3. Branch roles

| Branch                 | Repository      | Purpose                                          |
| ---------------------- | --------------- | ------------------------------------------------ |
| `main`               | Personal GitHub | Development source and source of truth           |
| `gh-pages-schneider` | Personal GitHub | Automatically generated Schneider static website |
| `gh-pages-schneider-ext` | Personal GitHub | Generated static website with GitHub project-page asset paths |
| `main`               | Schneider GHES  | Mirrored source code                             |
| `gh-pages-schneider` | Schneider GHES  | Static files served by Schneider GitHub Pages    |
| `main`               | `camillebloch/IEC61850ToolBox` | Mirrored source code                 |
| `gh-pages-schneider` | `camillebloch/IEC61850ToolBox` | Static files served by GitHub Pages |

Both generated branches are created automatically and must not be edited manually.

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

The build modes behave as follows:

```text
npm run build
    -> /IEC61850ToolBox/

npm run build:schneider
    -> /SESA160638/IEC61850ToolBox/

npm run build:schneider-ext
    -> /IEC61850ToolBox/
```

The standard build and `schneider-ext` mode use the GitHub project-page asset path. The `schneider` mode uses Schneider's `/SESA160638/IEC61850ToolBox/` path. Each Schneider-targeted mode loads its matching `.env` file, which sets the Render backend and limits `VITE_ENABLED_TOOLS` to `scl-patch-runner`. The workflow publishes the resulting bundles as `gh-pages-schneider` and `gh-pages-schneider-ext` respectively. Tool visibility is a UI setting and does not remove implementation from the client bundle.

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

      - name: Build static site for Schneider Pages
        run: npm run build:schneider -- --outDir dist-schneider

      - name: Add Schneider Pages marker
        run: touch dist-schneider/.nojekyll

      - name: Publish generated site to gh-pages-schneider
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd dist-schneider
          git init
          git checkout -b gh-pages-schneider
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add --all
          git commit -m "Build Schneider Pages from ${GITHUB_SHA}"
          git remote add origin "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
          git push --force origin gh-pages-schneider

      - name: Build static site for external GitHub Pages
        run: npm run build:schneider-ext -- --outDir dist-schneider-ext

      - name: Add external Pages marker
        run: touch dist-schneider-ext/.nojekyll

      - name: Publish generated site to gh-pages-schneider-ext
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd dist-schneider-ext
          git init
          git checkout -b gh-pages-schneider-ext
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add --all
          git commit -m "Build external Pages from ${GITHUB_SHA}"
          git remote add origin "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
          git push --force origin gh-pages-schneider-ext
```

---

## 6. Personal repository permissions

In the personal GitHub repository, open:

```text
Settings > Actions > General > Workflow permissions
```

Select `Read and write permissions`. Ensure branch rules allow the workflow to create or force-update both generated branches:

```text
gh-pages-schneider
gh-pages-schneider-ext
```

This allows the workflow's `GITHUB_TOKEN` to create and replace both generated branches.

---

## 7. Commit the configuration

From the normal personal development checkout:

```bash
git add vite.config.js package.json .env.schneider-ext .github/workflows/build-schneider-pages.yml
git commit -m "Configure Schneider Pages publication"
git push origin main
```

A push to `main` starts the workflow automatically.

The workflow can also be started manually from:

```text
Actions > Build Schneider Pages branches > Run workflow
```

---

## 8. Generated branch content

After a successful workflow run, both generated branches must contain the generated files at their root:

```text
gh-pages-schneider
├── index.html
├── .nojekyll
└── assets/
    ├── *.js
    └── *.css

gh-pages-schneider-ext
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

The external branch's `index.html` should reference assets under `/IEC61850ToolBox/assets/`, not the Schneider-specific prefix.

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
git remote add schneider-ext https://github.com/camillebloch/IEC61850ToolBox.git
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
schneider-ext  https://github.com/camillebloch/IEC61850ToolBox.git (fetch)
schneider-ext  https://github.com/camillebloch/IEC61850ToolBox.git (push)
```

---

## 10. Publish to both destination repositories

Run the synchronization only after the personal GitHub Actions workflow has completed successfully. The publication script sends `main` and tags to both destination repositories. It sends the Schneider build from personal `gh-pages-schneider` to Schneider's `gh-pages-schneider` branch, and sends the external build from personal `gh-pages-schneider-ext` to `schneider-ext`'s `gh-pages-schneider` branch.

Open the local mirror:

```powershell
cd C:\GIT-Mirror\IEC61850ToolBox.git
```

Fetch the latest source branches:

```bash
git fetch --prune personal
```

This publishes the following content:

```text
schneider:
  main
  gh-pages-schneider (built with /SESA160638/IEC61850ToolBox/)

schneider-ext:
  main
  gh-pages-schneider (built with /IEC61850ToolBox/)
```

Do not use either of these commands:

```bash
git push --mirror schneider
git push --mirror schneider-ext
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

## 12. Configure external GitHub Pages

In `camillebloch/IEC61850ToolBox`, open `Settings > Pages` and configure:

```text
Source:  Deploy from a branch
Branch:  gh-pages-schneider
Folder:  /(root)
```

The published site is:

```text
https://camillebloch.github.io/IEC61850ToolBox/
```

---

## 13. Routine publication process

### Automatic process on personal GitHub

Every push to personal `main` automatically:

1. Checks out the source.
2. Installs dependencies.
3. Builds Schneider's site in `schneider` mode and publishes it to `gh-pages-schneider`.
4. Builds the external site in `schneider-ext` mode and publishes it to `gh-pages-schneider-ext`.
5. Adds `.nojekyll` to each generated site.

### Controlled transfer to both repositories

After the personal workflow succeeds:

```bash
cd C:/GIT-Mirror/IEC61850ToolBox.git
git fetch --prune personal
```

The deployment script publishes source and tags to both remotes, then maps the corresponding generated site branch to each remote's `gh-pages-schneider` branch.

---

## 14. PowerShell publication script

Use the checked-in script:

```text
C:\GIT-Mirror\Publish-To-Schneider.ps1
```

Copy the repository's `Publish-To-Schneider.ps1` to this path if needed. The script fetches the generated branches from `personal`, publishes `gh-pages-schneider` to the Schneider repository and `gh-pages-schneider-ext` to the external repository (mapping both to the destination branch `gh-pages-schneider`), and publishes `main` and tags to both. It attempts both remotes if one fails and exits unsuccessfully if either target fails.

Run the script with:

```powershell
powershell -ExecutionPolicy Bypass -File C:\GIT-Mirror\Publish-To-Schneider.ps1
```

---

## 15. Verification checklist

### Personal GitHub

- [ ] `main` contains the current source.
- [ ] The `Build Schneider Pages branches` workflow succeeds.
- [ ] `gh-pages-schneider` exists.
- [ ] `gh-pages-schneider-ext` exists.
- [ ] `gh-pages-schneider/index.html` exists.
- [ ] `gh-pages-schneider-ext/index.html` exists.
- [ ] `.nojekyll` exists.
- [ ] `assets/` contains compiled JavaScript and CSS.
- [ ] Asset paths contain `/SESA160638/IEC61850ToolBox/`.
- [ ] The external build references `/IEC61850ToolBox/assets/`.

### Schneider GitHub Enterprise

- [ ] `main` contains the current mirrored source.
- [ ] `gh-pages-schneider` exists.
- [ ] `gh-pages-schneider` contains only generated static files.
- [ ] Pages is configured for `gh-pages-schneider / (root)`.
- [ ] The website opens correctly.
- [ ] Browser Developer Tools show no missing JavaScript or CSS files.

### External GitHub repository

- [ ] `main` contains the current mirrored source.
- [ ] `gh-pages-schneider` contains the external build with `/IEC61850ToolBox/` asset paths.
- [ ] Pages is configured for `gh-pages-schneider / (root)`.
- [ ] `https://camillebloch.github.io/IEC61850ToolBox/` opens with no missing assets.

---

## 16. Troubleshooting

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
