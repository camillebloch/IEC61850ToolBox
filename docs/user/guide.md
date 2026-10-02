# User Guide

## Goal

The tool provides three browser-based IEC 61850 workflows:

- compare an **SSD** file (system specification) with an **ICD** file (IED capabilities),
- search SCL data instances that are linked to a DataTypeTemplates identifier,
- run the PLES SCL patch workflow on an ICD, IID, or SCD submission.

## SCL patch runner workflow

1. Open the **SCL patch runner** tool. It is selected by default.
2. Select an ICD, IID, or SCD input file.
3. Toggle each built-in patch and each parameterized rule to enable or disable it.
4. Use **Edit** on a parameterized rule to change its action fields or the file extensions it applies to; optionally add a custom rule or remove an existing one.
5. Click **Run patch**.
6. The browser sends the file and the selected rule set to the configured patch backend.
7. The backend runs the Python patch script and downloads the patched file.

The patch service must be reachable through the `VITE_PATCH_API_URL` environment variable. For local development, point it to `http://localhost:8000`. For GitHub Pages, use the public Render URL of the deployed backend. Parameterized rules default to enabled; each can be toggled independently, edited, and assigned its own extension list.

## IED compatibility checker workflow

1. Open the **IED compatibility Checker** tool.
2. Upload one SSD file.
3. Upload one ICD file.
4. Select the IED to verify from the SSD content.
5. Launch the comparison.
6. Review the summary and detailed report.
7. Export the report as PDF or Excel if needed.

## Search data instances workflow

1. Open the **Search data instances** tool.
2. Select an SCL source file. Supported SCL-oriented extensions are ICD, IID, ISD, CID, SSD, SCD, SED, ASD, and XML.
3. Enter a DataTypeTemplates identifier. The search accepts `LNodeType`, `DOType`, `DAType`, and `EnumType` IDs.
4. Click **Launch search**.
5. Review each matching IED / Logical Device / Logical Node and the resolved instance data.

The search resolves the requested type ID through the template graph before looking at runtime instances. For example, a `DOType` match returns the logical nodes using an `LNodeType` that references this data object type. If matching DOI, SDI, or DAI entries are present, the result shows their values and indexes; if the logical node exists but no instance data exists for the template path, the result explicitly reports that gap.

## Status meanings

- **CONFORME**: element is present and matches expected structure.
- **PARTIEL**: element exists but does not fully match expected structure.
- **MANQUANT**: expected element is absent from the ICD file.
- **SUPPLÉMENTAIRE**: element exists in ICD but is not required by SSD.

## Current scope

At this early stage, the compatibility checker focuses on structure comparison for:

- Logical Devices
- Logical Nodes
- Data Objects and Data Attributes
- Datasets
- Report Controls
- GSE Controls
- Core IED service flags

The data instance search currently focuses on template-driven navigation from `DataTypeTemplates` to existing DOI, SDI, and DAI values in parsed IED logical nodes.
