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
text, removes unused data type templates from ICD/IID inputs, truncates long
`desc` attributes, adds missing enum `Val` defaults to `DA`/`BDA` elements in
ICD/IID inputs, and applies optional XML rules to an input file. The result is
written to a separate output file by default.

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
[`public/ples-iop-rules.json`](../public/ples-iop-rules.json):

```powershell
python scripts/update-scl-for-ples.py input.scd --rules public/ples-iop-rules.json
```

The rule file has a top-level `hardcodedPatches` object to toggle built-in
patches independently:

```json
{
  "hardcodedPatches": {
    "remove-unused-data-type-templates": {
      "enabled": true,
      "extensions": ["icd", "iid"]
    },
    "add-empty-lpl-das": true,
    "add-enum-default-values": {
      "enabled": true,
      "extensions": ["icd", "iid"]
    },
    "expand-single-val-sgroups": true,
    "truncate-desc-255": false
  },
  "rules": []
}
```

Each hardcoded patch can be a boolean or an object with `enabled` and optional
`extensions`. Set `enabled` to `false` to disable the patch. Omitted switches
default to enabled. If `extensions` is omitted or empty, the patch applies to
all input file types; otherwise, the list filters it by suffix, case-insensitively.
The `rules` array contains the configurable XML rules. The `truncate-desc-255`
patch shortens any `desc` attribute over 255 characters to its first 255
characters.

Each parameterized rule may include an `enabled` boolean. It defaults to
`true`; setting it to `false` skips that rule while preserving it in the JSON
configuration. Rules may also include an `extensions` list to limit where they
run. An omitted or empty list applies the rule to every input extension.

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

In the web interface, use each rule's checkbox to toggle it, **Edit** to change
its action parameters, and the **Extensions** field to edit its file-type list.

Supported actions are `set-attribute`, `add-attribute`, `delete-attribute`,
`delete-duplicates`, `set-text`, `delete`, `replace`,
`replace-ancestor-attribute`, and `rename-data-type-template-id`. A `replace`
rule searches either element text or an attribute:

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

The `delete-attribute` action removes the named attribute from each element
matched by its XPath and logs only elements where that attribute existed.

The `delete-duplicates` action groups XPath matches by the exact values of the
attributes in its `attributes` array, keeps the first element in document order,
and deletes later duplicates. Matches missing any grouping attribute are
preserved. For example:

```json
{
  "action": "delete-duplicates",
  "xpath": "//*[local-name()='Hitem']",
  "attributes": ["version", "revision"]
}
```

The `replace-ancestor-attribute` action replaces an ancestor attribute value
inside matched element text. It uses `ancestor`, `attribute`, and `replace`,
for example to mask an enclosing IED name with `@`.

The `rename-data-type-template-id` action renames an ID and its SCL-defined
references using case-sensitive exact matching. Set `search` and `replace`;
optionally limit definitions with `templateTypes`:

```json
{
  "action": "rename-data-type-template-id",
  "search": "OldTypeId",
  "replace": "NewTypeId",
  "templateTypes": ["LNodeType", "DOType", "DAType", "EnumType"],
  "required": true
}
```

The action updates the matching template definition and its schema-defined
references, and rejects a replacement ID already used by another template.
See [`PLESIOPRULES.md`](PLESIOPRULES.md) for the reference mapping.

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
