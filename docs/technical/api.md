# API and Core Modules

## `parseSCL(xmlString)`

Parses one SCL XML document and returns:

- header metadata
- list of parsed IEDs
- resolved `DataTypeTemplates` maps for LN/DO/DA resolution

### Notes

- Namespace prefixes are removed during parsing.
- Most SCL collections are normalized to arrays.

## `compareIED(specIED, realIED, specTemplates, realTemplates)`

Compares one SSD IED reference against one ICD IED target and returns a report.

### Comparison coverage

- Logical Device presence
- Logical Node presence and `lnType` consistency
- Data Object and Data Attribute coverage
- Dataset / ReportControl / GSEControl presence
- Service capability flags

## `exportPDF(report)`

Generates a PDF report from a comparison result.

## `exportExcel(report)`

Generates a workbook with:

- `Résumé` sheet (global metrics)
- `Détail` sheet (line-by-line findings)
