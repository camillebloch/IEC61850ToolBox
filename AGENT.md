# AGENTS.md

## Documentation rules

This repository must use structured Markdown documentation.

### Markdown file format

Use `.md` files for all Markdown documentation.

Avoid using alternative Markdown extensions such as:

- `.markdown`
- `.mdown`
- `.mkd`
- `.mkdown`

Unless there is a specific technical reason.

### Root documentation

The root `README.md` must remain a short entry point for the project.

It should contain:

- a short project description
- basic installation or startup instructions
- links to the user documentation
- links to the technical documentation
- links to contribution or development information, when relevant

The `README.md` must not become the full documentation.

### Documentation directory structure

Project documentation must be stored under the `docs/` directory.

Recommended structure:

```text
docs/
  user/
    guide.md
    installation.md
  technical/
    architecture.md
    configuration.md
    data-model.md
    api.md