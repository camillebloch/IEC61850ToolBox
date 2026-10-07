# PLES IOP Rules

This document describes the built-in XML transformations and the JSON rules
used with `update-scl-for-ples.py`.

## Rule 1: Expand Single-Value Setting Groups

**Patch name:** `expand-single-val-sgroups`

The script searches for `DA` elements that meet all of these conditions:

- The element local name is `DA`.
- The `fc` attribute is `SE` or `SG`.
- The `DA` has exactly one direct child whose local name is `Val`.
- That `Val` does not already have an `sGroup` attribute.

For each matching `DA`, the original `Val` is replaced by eight deep copies. The
copies receive `sGroup` values from `1` through `8`, in that order. Other
attributes, text, and child elements of the original `Val` are preserved.

The rule does not modify a `DA` when it has:

- No `Val` child.
- More than one direct `Val` child.
- A `Val` child that already has `sGroup`.
- An `fc` value other than `SE` or `SG`.

Example input:

```xml
<DA name="setVal" fc="SE">
  <Val>10</Val>
</DA>
```

Result:

```xml
<DA name="setVal" fc="SE">
  <Val sGroup="1">10</Val>
  <Val sGroup="2">10</Val>
  <Val sGroup="3">10</Val>
  <Val sGroup="4">10</Val>
  <Val sGroup="5">10</Val>
  <Val sGroup="6">10</Val>
  <Val sGroup="7">10</Val>
  <Val sGroup="8">10</Val>
</DA>
```

The patch log records one entry for the updated `DA` parent, not one entry for
each generated `Val`.

## Rule 2: Add Missing LPL Data Attributes

**Patch name:** `add-empty-lpl-das`

The script searches for `DOType` elements that meet all of these conditions:

- The element local name is `DOType`.
- The `cdc` attribute is `LPL`.
- The element has no child elements.

Four `DA` children are then added:

| `name` | `bType` | `fc` |
| --- | --- | --- |
| `vendor` | `VisString255` | `DC` |
| `swRev` | `VisString255` | `DC` |
| `configRev` | `VisString255` | `DC` |
| `ldNs` | `VisString255` | `EX` |

The generated `DA` elements use the same XML namespace as their parent
`DOType`. A non-empty `LPL` `DOType` is not changed, even if one or more of
these attributes are missing.

Example input:

```xml
<DOType id="LPL_Type" cdc="LPL"/>
```

Result:

```xml
<DOType id="LPL_Type" cdc="LPL">
  <DA name="vendor" bType="VisString255" fc="DC"/>
  <DA name="swRev" bType="VisString255" fc="DC"/>
  <DA name="configRev" bType="VisString255" fc="DC"/>
  <DA name="ldNs" bType="VisString255" fc="EX"/>
</DOType>
```

The patch log records one entry for the updated `DOType` parent, not one entry
for each generated `DA`.

## Rule 3: Normalize Value Text

**JSON action:** `replace`

**Rule file:** `public/ples-iop-rules.json`

The JSON rules search every `Val` element in the SCL document with `target` set
to `text`. Each occurrence of the configured `search` string is replaced by
the configured `replace` string. Other text and attributes are preserved.

The current text replacements are:

| Search | Replacement | Purpose |
| --- | --- | --- |
| `\u2013` (en dash, `–`) | `-` | Normalize the dash character |
| `φ` | `Phi` | Replace the Greek phi character |
| `µ` | `u` | Replace the micro sign |
| `>616<` | `>99999<` | Replace the value marker |

Example:

```xml
<Val>left–right</Val>
```

becomes:

```xml
<Val>left-right</Val>
```

The patch log records one entry for each changed `Val` element and includes the
searched and replacement values.

The same action can target an attribute by setting `target` to `attribute` and
providing the attribute name in `attribute`:

```json
{
  "action": "replace",
  "target": "attribute",
  "attribute": "desc",
  "search": "–",
  "replace": "-",
  "xpath": "//{*}DA"
}
```

## Rule 4: Normalize Tms SI Units

**JSON action:** `set-text`

The JSON rules search this direct hierarchy:

```text
DOI(name="Tms")/SDI(name="units")/DAI(name="SIUnits")/Val
```

The text of each matching `Val` is set to `s`. The XPath uses `local-name()`
so it works with namespaced SCL documents. This rule has no extension filter
and therefore applies to all input file types.

Example result:

```xml
<DAI name="SIUnits">
  <Val>s</Val>
</DAI>
```

## Rule 5: Mask PowerLogic IED Names in Group References

**JSON action:** `replace-ancestor-attribute`

For `.icd` and `.iid` files, the rule searches inside each
`IED(type="PowerLogic-P7")` for this hierarchy:

```text
DOI(name="GrRef")/DAI(name="setSrcRef")/Val
```

For every matching `Val`, the enclosing IED `name` attribute is found and only
that exact substring in the `Val` text is replaced by `@`. The rest of the
value remains unchanged. For example, `prefix/P7_MAIN/suffix` becomes
`prefix/@/suffix`.

## Rule 6: Rename a Data Type Template ID

**JSON action:** `rename-data-type-template-id`

Set `search` to the existing ID and `replace` to its new ID. `templateTypes`
can restrict which definition kinds are eligible; when omitted, all four
supported kinds are searched. ID matching is case-sensitive and exact.

```json
{
  "action": "rename-data-type-template-id",
  "search": "OldTypeId",
  "replace": "NewTypeId",
  "templateTypes": ["LNodeType", "DOType", "DAType", "EnumType"],
  "required": true
}
```

When the matching definition is found inside `DataTypeTemplates`, the rule
renames its `id` and updates references according to their SCL roles:

| Definition | References updated |
| --- | --- |
| `LNodeType` | `LN`, `LN0`, and substation `LNode` `lnType` references |
| `DOType` | `LNodeType/DO` and `DOType/SDO` `type` references |
| `DAType` | `DOType/DA` and `DAType/BDA` `type` references |
| `EnumType` | `DOType/DA` and `DAType/BDA` `type` references |

Other attributes and element text are not searched or changed. The rule refuses
to rename to an ID already used by another data type template. With
`"required": true`, a missing source ID is reported as an error.

The mapping follows the IEC 61850-6 SCL schema: `id` values are unique within
`DataTypeTemplates`; its key references connect `LNodeType/DO` and
`DOType/SDO` to `DOType` IDs, and `DOType/DA` plus `DAType/BDA` to `DAType` or
`EnumType` IDs. The schema also defines logical-node `lnType` references to
`LNodeType` IDs. See the bundled 2007B4 schema in
[`SCL_DataTypeTemplates.xsd`](../tests/fixtures/SCL_DataTypeTemplates.xsd) and
the [IEC 61850-6 consolidated publication](https://webstore.iec.ch/publication/103863).

## Rule 7: Remove Unused Data Type Templates

**Patch name:** `remove-unused-data-type-template`

This hardcoded cleanup runs only for `.icd` and `.iid` inputs. It starts from
logical-node type references (`LN/@lnType`, `LN0/@lnType`, and
`LNode/@lnType`) and retains only reachable definitions:

1. Remove unreferenced `LNodeType` definitions.
2. Keep `DOType` definitions referenced by `LNodeType/DO/@type`, then follow
  nested `DOType/SDO/@type` references. Remove all other `DOType` definitions.
3. Keep `DAType` and `EnumType` definitions referenced by `DOType/DA/@type`,
  then follow `DAType/BDA/@type` references. Remove all other definitions of
  those two types.

ID comparisons are exact and case-sensitive. A nested type stays when it is
reachable through an SDO or BDA chain; types used only by removed templates are
removed as well. Each removed definition is recorded in `patch.log`.

## Rule 8: Limit Description Length

**Patch name:** `truncate-desc-255`

The script checks every XML element for a `desc` attribute. If its value is
longer than 255 characters, it keeps the first 255 characters and logs the
element path and original length. Values of 255 characters or fewer are left
unchanged. This patch runs after JSON rules.

## Rule 9: Add Default Values for Enum Attributes

**Patch name:** `add-enum-default-values`

This hardcoded patch runs only for `.icd` and `.iid` inputs. It finds `DA` and
`BDA` elements with `bType="Enum"` that do not have a direct `Val` child. The
element's `type` attribute is matched exactly and case-sensitively against an
`EnumType/@id`. If a matching `EnumType` has at least one `EnumVal`, a new
namespace-matched `Val` is added containing the text of its first `EnumVal`.
Elements that already contain a `Val`, reference no matching enum, or point to
an enum with no values are left unchanged. Each added value is logged by its
element path.

## Hardcoded Patch Switches

Each hardcoded patch can be independently enabled, disabled, and file-filtered
in the top-level `hardcodedPatches` object in the JSON rule file. A patch value
may be a boolean or an object with `enabled` and optional `extensions` fields.
If `extensions` is omitted or empty, that patch has no file-type filter. The
available names are `remove-unused-data-type-templates`, `add-empty-lpl-das`,
`add-enum-default-values`, `expand-single-val-sgroups`, and
`truncate-desc-255`. Omitted switches default to enabled.

For example, the two ICD/IID-only patches are configured with an extension
filter, while the other built-in patches run on any file type unless filtered:

```json
"remove-unused-data-type-templates": {
  "enabled": true,
  "extensions": ["icd", "iid"]
}
```

## Execution Order

For each input file, transformations run in this order:

1. For ICD/IID inputs, remove unreachable data type templates.
2. Add the four `DA` children to remaining empty `LPL` `DOType` elements.
3. For ICD/IID inputs, add missing enum `Val` defaults to `DA` and `BDA`.
4. Expand eligible single-value `DA` setting groups.
5. Apply rules supplied through `--rules` and repeated `--rule` options.
6. Truncate `desc` attributes longer than 255 characters.
7. Write the output file.
8. Append the applied patch paths to `patch.log` after a successful write.

## Configurable Rules

The JSON rules supplied by the command line are not hardcoded PLES IOP rules.
They support these actions:

- `set-attribute`
- `add-attribute`
- `delete-attribute`
- `delete-duplicates`
- `set-text`
- `delete`
- `replace`
- `replace-ancestor-attribute`
- `rename-data-type-template-id`

The current JSON file also includes the `set-text` rule that normalizes
`DOI(name="Tms")/SDI(name="units")/DAI(name="SIUnits")/Val` to `s`.

The current PLES IOP removal rules are in
[`public/ples-iop-rules.json`](../public/ples-iop-rules.json). They remove these logical nodes:

| IED `type` | `prefix` | `lnClass` | `lnInst` |
| --- | --- | --- | --- |
| `PowerLogic-P7` | `TCR` | `GLOC` | `1` |
| `PowerLogic-P7` | `T103` | `ITCI` | `1` |

The same rules file removes `pServT` from `ExtRef` elements inside
`PowerLogic-P7` IEDs when `intAddr` is absent and `pServT` is present. This
uses the `delete-attribute` action, which removes an attribute without deleting
its containing element.

The rules also remove duplicate `Hitem` elements by the exact
`version`/`revision` attribute pair, keeping the first match in document order.
An element missing either attribute is not considered a duplicate candidate.

The same JSON file also removes `ConnectedAP` elements only from ICD files when
all of these conditions are true:

- `apName` is `AP1`.
- `iedName` equals the `name` of an IED with `type="PowerLogic-P7"`.

The matching is performed across the document, so the `ConnectedAP` does not
need to be nested inside the IED element.

The rules use the namespace-independent `local-name()` form because IID files
normally use the SCL default namespace. They accept both `lnInst` and the
standard SCL `inst` attribute. For the TCR node they accept both the requested
`GLOC` spelling and the `GLOG` spelling present in the current PowerLogic IID.

Apply the file with:

```powershell
python scripts/update-scl-for-ples.py input.scd --rules public/ples-iop-rules.json
```

The rule evaluator supports standard XPath element names such as `//IED` and
full XPath predicates using `local-name()`. The `local-name()` form is useful
for SCL documents that use a default namespace or another namespace prefix.
The `extensions` array limits a rule to selected input suffixes. The LN
removal rules apply to `.icd` and `.iid`; the ConnectedAP rule applies only to
`.icd`; the value replacement rules have no extension filter and apply to all
input files. See the script README for the complete command examples and JSON
rule format.
