# Scripts

This directory contains standalone scripts for maintenance and file-processing tasks that are not part of the web application.

## Requirements

- Python 3.9 or newer
- Python package `lxml`
- Run commands from the repository root unless a script says otherwise

Install the Python dependency with:

```powershell
python -m pip install lxml
```

### Generate a Windows executable

The executable is built with PyInstaller and includes the Python runtime and
`lxml` dependency. From the repository root, create or activate a virtual
environment, install the dependencies, and build the one-file executable:

PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install lxml pyinstaller
python -m PyInstaller --onefile --name update-scl-for-ples scripts\update-scl-for-ples.py
```

macOS/Linux:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install lxml pyinstaller
python -m PyInstaller --onefile --name update-scl-for-ples scripts/update-scl-for-ples.py
```

The generated file is `dist/update-scl-for-ples.exe` on Windows. Build files
are placed in `build/` and can be removed after the build. Run
`dist/update-scl-for-ples.exe --help` to verify the executable.

GitHub Actions performs the same build automatically when
`scripts/update-scl-for-ples.py` changes. Download the
`update-scl-for-ples-<commit-sha>` artifact from the completed workflow run.

## `update-scl-for-ples.py`

Applies the built-in SCL/SCD value-group expansion, adds the standard `DA`
children to empty `DOType cdc="LPL"` elements, normalizes en dashes in `Val`
text, and applies optional XML rules to an input file. The result is written
to a separate output file by default.

The hardcoded PLES IOP transformations are documented in
the [PLES IOP rules reference](PLESIOPRULES.md).

### Basic usage

From PowerShell:

```powershell
python scripts/update-scl-for-ples.py input.scd output.scd
```

From macOS/Linux:

```bash
python3 scripts/update-scl-for-ples.py input.scd output.scd
```

The input file is not modified by default. If the output argument is omitted, the script writes a sibling file named `input_patched.scd`:

```powershell
python scripts/update-scl-for-ples.py input.scd
```

The input may be a quoted wildcard pattern. Each matching file is processed and
gets its own sibling output:

```powershell
python scripts/update-scl-for-ples.py "input-*.scd"
```

```bash
python3 scripts/update-scl-for-ples.py 'input-*.scd'
```

When a wildcard matches multiple files, omit the output argument. An explicit
output path can only be used when the input matches one file.

To overwrite the input file or every file matched by a wildcard, use
`--in-place`:

```powershell
python scripts/update-scl-for-ples.py --in-place "input-*.scd"
```

The `--in-place` option cannot be combined with an explicit output path.

An explicit output path may be a new file or an existing file that should be replaced.
Namespace declarations and prefixes from the input file, including unused declarations, are retained in the output.

After each file is written successfully, the script appends a record to
`patch.log` in the current working directory. Each record includes the input
file, output file, and every built-in or JSON rule patch applied. Each patch
includes the full SCL hierarchy path of the affected element, with its `name`
or `id` value in parentheses when available, for example
`SCL/DataTypeTemplates/DOType(empty)/DA(vendor)`. Files with no changes are
recorded as `Patches: none`. Built-in patches log one entry for their updated
parent (`DOType` or `DA`), while JSON rules log each matched element. `LDevice`
paths use `ldInst`; `LN` and `LN0` paths use `prefix`, `lnClass`, and `lnInst`
(or the SCL `inst` attribute) joined with underscores, such as
`LDevice(LD0)/LN(TCR_GLOG_1)`.
For JSON `replace` rules, entries also show the target and values, for example
`rule replace [text] '–' -> '-': SCL/Val`.
For JSON `set-text` rules, entries show the assigned text, for example
`rule set-text 's': SCL/DOI(Tms)/SDI(units)/DAI(SIUnit)/Val`.

### Apply rules from a JSON file

Rules can be supplied as a JSON array:

```json
[
  {
    "action": "set-attribute",
    "xpath": "//{*}IED",
    "name": "name",
    "value": "NewIEDName"
  },
  {
    "action": "delete",
    "xpath": "//{*}Private"
  }
]
```

Run the script with the rules file:

```powershell
python scripts/update-scl-for-ples.py input.scd --rules rules.json
```

The current PLES IOP removal rules are available in
[`ples-iop-rules.json`](ples-iop-rules.json):

```powershell
python scripts/update-scl-for-ples.py input.scd --rules scripts/ples-iop-rules.json
```

The rules handle the SCL default namespace and both `inst`/`lnInst` attribute
spellings used by the source files. The ConnectedAP rule applies only to ICD
files and removes matching `apName="AP1"` connections.
The current value text replacements also normalize `φ` to `Phi`, `µ` to `u`,
and `>616<` to `>99999<`.

Rules can be limited to specific input extensions with the `extensions` array.
Values are case-insensitive and may include or omit the leading dot:

```json
{
  "action": "delete",
  "extensions": ["icd", "iid"],
  "xpath": "//IED[@type='PowerLogic-P7']//LN[@prefix='TCR']"
}
```

Rules without `extensions` apply to every input file. A rule with
`extensions: ["icd", "iid"]` is skipped for `.scd` files.

Supported actions are `set-attribute`, `add-attribute`, `set-text`, `delete`,
`replace`, and `replace-ancestor-attribute`. A `replace` rule searches either
element text or an attribute:

```json
{
  "action": "replace",
  "target": "text",
  "search": "\u2013",
  "replace": "-",
  "xpath": "//{*}Val"
}
```

Use `"target": "attribute"` together with an `"attribute"` name to replace
characters in an attribute value.

The `replace-ancestor-attribute` action replaces an ancestor attribute value
inside matched element text. It uses `ancestor`, `attribute`, and `replace`,
for example to mask an enclosing IED name with `@`.

Rules support standard XPath element names such as `//IED[@type='PowerLogic-P7']`.
The `//{*}Element` shorthand matches an element by local name regardless of
its XML namespace, and full XPath expressions using `local-name()` are also
supported. Add `"required": true` to a rule when it must match at least one
element.

Individual rules can also be passed repeatedly on the command line:

```powershell
python scripts/update-scl-for-ples.py input.scd `
  --rule '{"action":"set-attribute","xpath":"//{*}IED","name":"name","value":"NewIEDName"}'
```

## Adding a script

When adding a script, update this README with:

1. The script filename and purpose.
2. Required runtime, dependencies, and input formats.
3. Copyable PowerShell and macOS/Linux commands.
4. Important options, examples, and output behavior.

Prefer scripts with a clear command-line interface, a useful `--help` message, and a non-zero exit code when processing fails.
