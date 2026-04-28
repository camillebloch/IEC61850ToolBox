# User Guide

## Goal

The tool compares:

- an **SSD** file (system specification)
- an **ICD** file (IED capabilities)

It reports which elements of a target IED are compliant, partially compliant, missing, or additional.

## Workflow

1. Upload one SSD file.
2. Upload one ICD file.
3. Select the IED to verify from the SSD content.
4. Launch the comparison.
5. Review the summary and detailed report.
6. Export the report as PDF or Excel if needed.

## Status meanings

- **CONFORME**: element is present and matches expected structure.
- **PARTIEL**: element exists but does not fully match expected structure.
- **MANQUANT**: expected element is absent from the ICD file.
- **SUPPLÉMENTAIRE**: element exists in ICD but is not required by SSD.

## Current scope

At this early stage, the tool focuses on structure comparison for:

- Logical Devices
- Logical Nodes
- Data Objects and Data Attributes
- Datasets
- Report Controls
- GSE Controls
- Core IED service flags
