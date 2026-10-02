# Changelog

All notable user-facing evolutions of IEC61850ToolBox are documented in this file.

The changelog is intentionally high-level:

- include new user-visible features
- include major functional updates or refactors
- include significant behavior changes
- avoid logging every small internal code edit

## [Unreleased]

### Added

- Added an SCL patch runner tool that is active by default, loads the configured PLES patch JSON, allows individual patches to be enabled or disabled, and generates the Python command line for the selected SCL input file.
- Added persistent enable/disable settings and inline editing for parameterized patches, including per-rule extension filters.
- Added executable data instance search that resolves `LNodeType`, `DOType`, `DAType`, and `EnumType` IDs to matching DOI, SDI, and DAI values in SCL files.
- Added SCL source file selection and data type identifier input controls to the Search data instances panel.
- Initial documentation set under `docs/` for user and technical guidance.
- Initial changelog process to track major product evolutions.
