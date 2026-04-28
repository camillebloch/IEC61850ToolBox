# Architecture

## Overview

IEC61850ToolBox is a React + Vite frontend application. It runs entirely in the browser:

1. XML files are loaded by the user.
2. Parsing is performed in client-side JavaScript.
3. Comparison logic generates a normalized report model.
4. UI renders summary + details.
5. Exports are generated client-side (PDF/Excel).

## Main modules

- `src/App.jsx`: state orchestration and high-level workflow.
- `src/components/FileUploadPanel.jsx`: SSD/ICD loading and IED selection.
- `src/components/ComparisonReport.jsx`: report rendering and export actions.
- `src/lib/parseSCL.js`: SCL parser and normalized data extraction.
- `src/lib/compareIED.js`: comparison engine.
- `src/lib/exportReport.js`: PDF and Excel exports.

## Data flow

1. Raw XML → `parseSCL`.
2. Parsed SSD + ICD models → `compareIED`.
3. Comparison output → `ComparisonReport`.
4. Optional export → `exportPDF` / `exportExcel`.
