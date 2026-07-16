# Architecture

## Overview

IEC61850ToolBox is a React + Vite frontend application. It runs entirely in the browser:

1. XML files are loaded by the user.
2. Parsing is performed in client-side JavaScript.
3. Compatibility checking compares normalized SSD and ICD models.
4. Data instance search resolves DataTypeTemplates identifiers to matching DOI, SDI, and DAI values.
5. UI renders summaries, details, and search results.
6. Exports are generated client-side (PDF/Excel).

## Main modules

- `src/App.jsx`: state orchestration and high-level workflow.
- `src/components/FileUploadPanel.jsx`: SSD/ICD loading and IED selection.
- `src/components/ComparisonReport.jsx`: report rendering and export actions.
- `src/lib/parseSCL.js`: SCL parser and normalized data extraction.
- `src/lib/compareIED.js`: comparison engine.
- `src/lib/searchDataInstances.js`: template-driven data instance search engine.
- `src/lib/exportReport.js`: PDF and Excel exports.

## Compatibility checker data flow

1. Raw SSD and ICD XML → `parseSCL`.
2. Parsed SSD + ICD models → `compareIED`.
3. Comparison output → `ComparisonReport`.
4. Optional export → `exportPDF` / `exportExcel`.

## Data instance search flow

1. Raw SCL XML → `parseSCL`.
2. Parsed SCL model + DataTypeTemplates ID → `searchDataInstancesByTypeId`.
3. Resolved template paths + matching instance trees → search result pane in `src/App.jsx`.
