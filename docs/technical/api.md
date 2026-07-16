# API and Core Modules

## `parseSCL(xmlString)`

Parses one SCL XML document and returns:

- header metadata,
- list of parsed IEDs,
- resolved `DataTypeTemplates` maps for LN/DO/DA/enum resolution,
- DOI, SDI, and DAI instance trees with values and optional indexes.

### Notes

- Namespace prefixes are removed during parsing.
- Most SCL collections are normalized to arrays.
- `Val` nodes are preserved as text values so downstream tools can display configured instance values.
- `EnumType` definitions are parsed alongside `LNodeType`, `DOType`, and `DAType` maps.

## `compareIED(specIED, realIED, specTemplates, realTemplates)`

Compares one SSD IED reference against one ICD IED target and returns a report.

### Comparison coverage

- Logical Device presence
- Logical Node presence and `lnType` consistency
- Data Object and Data Attribute coverage
- Dataset / ReportControl / GSEControl presence
- Service capability flags

## `searchDataInstancesByTypeId(sclModel, dataTypeId)`

Searches parsed SCL instance data by DataTypeTemplates identifier.

The function resolves the provided ID through the template graph:

- direct `LNodeType` matches,
- `DOType` references from logical node data objects,
- nested `SDO` references,
- `DAType` structures reached from structured data attributes,
- `EnumType` references used by enum data attributes.

It returns a status, a user-facing message, resolved template paths, and matching IED / Logical Device / Logical Node entries. Each entry includes the DOI, SDI, or DAI instance found for the resolved path when instance data exists.

### Search statuses

- `empty`: no data type ID was provided.
- `not-found`: the requested ID is not present in the parsed templates.
- `no-ln`: the ID exists in templates, but no LN or LN0 implements a resolved `LNodeType`.
- `found`: at least one logical node uses the resolved template path.

## `exportPDF(report)`

Generates a PDF report from a comparison result.

## `exportExcel(report)`

Generates a workbook with:

- `Résumé` sheet (global metrics)
- `Détail` sheet (line-by-line findings)
