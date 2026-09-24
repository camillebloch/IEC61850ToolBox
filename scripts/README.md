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

Applies the built-in SCL/SCD value-group expansion and optional XML rules to an input file, then writes the result to a separate output file.

### Basic usage

From PowerShell:

```powershell
python scripts/update-scl-for-ples.py input.scd output.scd
```

From macOS/Linux:

```bash
python3 scripts/update-scl-for-ples.py input.scd output.scd
```

The input file is not modified. If the output argument is omitted, the script writes a sibling file named `input_patched.scd`:

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

An explicit output path may be a new file or an existing file that should be replaced.
Namespace declarations and prefixes from the input file, including unused declarations, are retained in the output.

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

Supported actions are `set-attribute`, `add-attribute`, `set-text`, and `delete`. An XPath beginning with `//{*}` matches an element by local name regardless of its XML namespace. Add `"required": true` to a rule when it must match at least one element.

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
