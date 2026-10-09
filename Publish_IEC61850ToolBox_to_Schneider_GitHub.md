# Publishing IEC61850ToolBox from Personal GitHub to Schneider GitHub Enterprise

## Purpose

This document describes a **one-way publication workflow** for the `IEC61850ToolBox` repository:

```text
Personal GitHub repository
https://github.com/milka34Fr/IEC61850ToolBox
              |
              | fetch
              v
Local bare mirror
              |
              | push branches and tags
              v
Schneider GitHub Enterprise repository
https://github.schneider-electric.com/SESA160638/IEC61850ToolBox
```

The personal repository remains the **source of truth**. The Schneider repository is a downstream corporate copy used for internal visibility and, if enabled, Schneider GitHub Pages.

> Important: This is intentionally a one-way process. Do not develop independently in both repositories.

---

## 1. Prerequisites

Before starting, confirm that:

- Git is installed:

  ```bash
  git --version
  ```
- You can access the personal repository on GitHub.com.
- You can access the Schneider repository on the Schneider network or VPN.
- The destination repository already exists and is empty:

  ```text
  https://github.schneider-electric.com/SESA160638/IEC61850ToolBox
  ```
- You have permission to push to the Schneider repository.
- The repository content is approved for publication into the Schneider environment.

---

## 2. Repository roles

| Repository                                                   | Role                                                |
| ------------------------------------------------------------ | --------------------------------------------------- |
| `github.com/milka34Fr/IEC61850ToolBox`                     | Personal development repository and source of truth |
| Local bare repository                                        | Temporary synchronization bridge                    |
| `github.schneider-electric.com/SESA160638/IEC61850ToolBox` | Schneider downstream publication copy               |

Perform normal development only in a regular working clone of the personal repository.

---

## 3. Create the local publishing mirror

Choose a local directory dedicated to repository mirrors. In PowerShell, for example:

```powershell
mkdir C:\GitHub-mirrors
cd C:\GitHub-mirrors
```

Create a bare mirror clone of the personal repository:

```bash
git clone --mirror https://github.com/milka34Fr/IEC61850ToolBox.git
cd IEC61850ToolBox.git
```

A bare mirror has no working directory. It is used for synchronization, not for editing source files.

---

## 4. Configure explicit remotes

Rename the source remote to make the direction clear:

```bash
git remote rename origin personal
```

Add the Schneider destination:

```bash
git remote add schneider https://github.schneider-electric.com/SESA160638/IEC61850ToolBox.git
```

Verify the configuration:

```bash
git remote -v
```

Expected structure:

```text
personal   https://github.com/milka34Fr/IEC61850ToolBox.git (fetch)
personal   https://github.com/milka34Fr/IEC61850ToolBox.git (push)
schneider  https://github.schneider-electric.com/SESA160638/IEC61850ToolBox.git (fetch)
schneider  https://github.schneider-electric.com/SESA160638/IEC61850ToolBox.git (push)
```

The `personal` push URL exists technically, but this publishing mirror should only fetch from `personal` and push to `schneider`.

---

## 5. Initial publication

Fetch the current state of the personal repository and remove stale local references:

```bash
git fetch --prune personal
```

Push all branches to Schneider:

```bash
git push schneider --all
```

Push all tags to Schneider:

```bash
git push schneider --tags
```

Verify the result by opening the Schneider repository and checking its default branch, branches, tags, files, and commit history.

---

## 6. Why not use `git push --mirror` here?

A GitHub mirror clone can contain GitHub-managed pull-request references such as:

```text
refs/pull/1/head
refs/pull/16/merge
```

A command such as:

```bash
git push --mirror schneider
```

attempts to push every reference, including `refs/pull/*`. GitHub Enterprise rejects these hidden references with messages such as:

```text
remote rejected: refs/pull/1/head (deny updating a hidden ref)
```

For this GitHub.com-to-Schneider workflow, publish only normal branches and tags:

```bash
git push schneider --all
git push schneider --tags
```

This preserves the code branches, release tags, and commit history without trying to copy GitHub's internal pull-request references.

---

## 7. Normal development workflow

Use a separate, regular clone for development:

```bash
git clone https://github.com/milka34Fr/IEC61850ToolBox.git
cd IEC61850ToolBox
```

Work normally:

```bash
git checkout main
# Edit files
git add .
git commit -m "Describe the change"
git push origin main
```

Do not edit files inside `IEC61850ToolBox.git`, because it is a bare publishing mirror.

---

## 8. Publish later updates to Schneider

Whenever an approved personal version is ready for Schneider publication, open a terminal in the mirror directory:

```powershell
cd C:\GitHub-mirrors\IEC61850ToolBox.git
```

Fetch the latest personal repository state:

```bash
git fetch --prune personal
```

Publish branches and tags:

```bash
git push schneider --all
git push schneider --tags
```

Recommended publication sequence:

```text
Develop and test personally
        |
        v
Commit and push to GitHub.com
        |
        v
Review content for Schneider publication
        |
        v
Fetch into the local bare mirror
        |
        v
Push branches and tags to Schneider GHES
        |
        v
Verify the Schneider repository and Pages site
```

---

## 9. Optional PowerShell publication script

Create a file named `Publish-To-Schneider.ps1` outside the bare mirror, for example in `C:\GitHub-mirrors`:

```powershell
$ErrorActionPreference = "Stop"
$MirrorPath = "C:\GitHub-mirrors\IEC61850ToolBox.git"

Set-Location $MirrorPath

Write-Host "Fetching the personal GitHub repository..."
git fetch --prune personal

Write-Host "Publishing branches to Schneider GitHub Enterprise..."
git push schneider --all

Write-Host "Publishing tags to Schneider GitHub Enterprise..."
git push schneider --tags

Write-Host "Publication completed. Verify the destination repository."
```

Run it with:

```powershell
powershell -ExecutionPolicy Bypass -File C:\GitHub-mirrors\Publish-To-Schneider.ps1
```

The script deliberately does not use `git push --mirror`.

---

## 10. Optional deletion synchronization

The commands `git push --all` and `git push --tags` update and create branches and tags, but do not automatically delete destination refs that were deleted from the personal source.

Review before deleting anything from Schneider. To delete a specific obsolete Schneider branch:

```bash
git push schneider --delete branch-name
```

To delete a specific obsolete Schneider tag:

```bash
git push schneider --delete tag tag-name
```

Avoid broad automated deletion unless the Schneider repository is formally treated as a disposable mirror and the deletion behavior has been approved.

---

## 11. Connectivity troubleshooting

### HTTPS reset when accessing GitHub.com

Example:

```text
curl: (35) Recv failure: Connection was reset
```

This indicates a network, proxy, VPN, or firewall-path problem rather than a repository permission problem. Test the same command on an approved alternative network to isolate the network path:

```powershell
curl.exe -I https://github.com
```

Do not disable TLS verification as a workaround.

### SSH timeout

If both normal SSH and GitHub SSH-over-443 time out, the corporate network path may be blocking or interfering with outbound SSH. Use an approved network path or request support rather than bypassing Schneider controls.

### Hidden-ref rejection

Example:

```text
refs/pull/1/head (deny updating a hidden ref)
```

Resolution:

```bash
git push schneider --all
git push schneider --tags
```

### Authentication failure

Confirm the remote URLs:

```bash
git remote -v
```

Confirm that the correct GitHub.com and Schneider GitHub Enterprise credentials are available. A token or enterprise authentication method may be required depending on repository and server configuration.

---

## 12. Verification checklist

After each publication, verify:

- [ ] The expected default branch exists on Schneider GHES.
- [ ] The latest approved commit is present.
- [ ] Required branches are present.
- [ ] Required release tags are present.
- [ ] No confidential or personal-only content was published.
- [ ] The `README.md`, licence, and attribution are correct.
- [ ] Schneider repository visibility is appropriate.
- [ ] Branch protection and maintainer settings are configured if needed.
- [ ] The Schneider GitHub Pages site builds successfully, if Pages is enabled.

---

## 13. Quick command reference

### One-time setup

```bash
git clone --mirror https://github.com/milka34Fr/IEC61850ToolBox.git
cd IEC61850ToolBox.git
git remote rename origin personal
git remote add schneider https://github.schneider-electric.com/SESA160638/IEC61850ToolBox.git
git remote -v
```

### Publish

```bash
git fetch --prune personal
git push schneider --all
git push schneider --tags
```

### Inspect local references

```bash
git show-ref
```

### Verify destination branches and tags remotely

```bash
git ls-remote --heads schneider
git ls-remote --tags schneider
```

---

## 14. Governance note

Publishing a personal repository into Schneider GitHub Enterprise can make the content appear associated with Schneider Electric. Before publication, confirm ownership, licensing, confidentiality, cybersecurity, and repository-visibility requirements. Use the Schneider repository as a deliberate, reviewed publication point rather than an uncontrolled live replica.

## References

- [GitHub documentation: Duplicating a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/duplicating-a-repository)
- [GitHub documentation: Troubleshooting connectivity problems](https://docs.github.com/en/get-started/using-github/troubleshooting-connectivity-problems)
- [GitHub documentation: Using SSH over the HTTPS port](https://docs.github.com/en/authentication/troubleshooting-ssh/using-ssh-over-the-https-port)
