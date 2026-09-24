#!/usr/bin/env python3
"""Apply configurable XML rules to an IEC 61850 SCL/SCD file.

Rules are JSON objects with one of these actions:
  {"action": "set-attribute", "xpath": "//{*}IED", "name": "name", "value": "new"}
  {"action": "set-text", "xpath": "//{*}Private", "value": "text"}
  {"action": "delete", "xpath": "//{*}Private"}
  {"action": "add-attribute", "xpath": "//{*}IED", "name": "x", "value": "y"}

The XPath uses ElementTree syntax.  ``{*}`` can be used to match elements in
any namespace, which is useful for SCL files.
"""

import argparse
from copy import deepcopy
import glob
import json
import sys
from pathlib import Path

from lxml import etree as ET


def elements(root, xpath):
	"""Find elements while accepting the convenient //{*}tag notation."""
	if xpath.startswith("//{*}"):
		tag = xpath[5:]
		return [element for element in root.iter()
				if element.tag.rsplit("}", 1)[-1] == tag]
	return root.findall(xpath)


def parent_map(root):
	return {child: parent for parent in root.iter() for child in parent}


def expand_single_val_sgroups(root):
	"""Duplicate an ungrouped Val under applicable DA elements for groups 1-8."""
	for da in list(root.iter()):
		if (da.tag.rsplit("}", 1)[-1] != "DA" or
			da.get("fc") not in ("SE", "SG")):
			continue

		vals = [child for child in da
				if child.tag.rsplit("}", 1)[-1] == "Val"]
		if len(vals) != 1 or "sGroup" in vals[0].attrib:
			continue

		original = vals[0]
		position = list(da).index(original)
		da.remove(original)
		for group in range(1, 9):
			duplicate = deepcopy(original)
			duplicate.set("sGroup", str(group))
			da.insert(position + group - 1, duplicate)


def apply_rule(root, rule):
	action = rule.get("action")
	matches = elements(root, rule["xpath"])
	if not matches:
		if rule.get("required", False):
			raise ValueError("rule matched no elements: {}".format(rule["xpath"]))
		return 0

	if action in ("set-attribute", "add-attribute"):
		for element in matches:
			element.set(rule["name"], str(rule.get("value", "")))
	elif action == "set-text":
		for element in matches:
			element.text = str(rule.get("value", ""))
	elif action == "delete":
		parents = parent_map(root)
		for element in matches:
			parent = parents.get(element)
			if parent is not None:
				parent.remove(element)
	else:
		raise ValueError("unsupported rule action: {}".format(action))
	return len(matches)


def load_rules(args):
	rules = []
	if args.rules:
		with args.rules.open(encoding="utf-8") as stream:
			data = json.load(stream)
		rules.extend(data if isinstance(data, list) else data["rules"])
	rules.extend(json.loads(rule) for rule in args.rule)
	return rules


def parse_xml(path):
	"""Parse XML while preserving namespace declarations at their source elements."""
	return ET.parse(path)


def process_file(input_path, output_path, rules):
	tree = parse_xml(input_path)
	expand_single_val_sgroups(tree.getroot())
	for rule in rules:
		apply_rule(tree.getroot(), rule)
	ET.indent(tree, space="  ")
	tree.write(output_path, encoding="utf-8", xml_declaration=True)


def main():
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("input", help="source SCL/SCD file or wildcard pattern")
	parser.add_argument("output", type=Path, nargs="?",
					help="patched SCD file (default: input name with _patched suffix)")
	parser.add_argument("--rules", type=Path, help="JSON file containing a rule list")
	parser.add_argument("--rule", action="append", default=[],
						help="one JSON rule; may be specified repeatedly")
	args = parser.parse_args()

	try:
		input_paths = [Path(path) for path in sorted(glob.glob(args.input))]
		if not input_paths:
			raise ValueError("input pattern matched no files: {}".format(args.input))
		if args.output and len(input_paths) > 1:
			raise ValueError("an explicit output path requires exactly one input file")

		rules = load_rules(args)
		for input_path in input_paths:
			output = args.output or input_path.with_name(
				input_path.stem + "_patched" + input_path.suffix)
			process_file(input_path, output, rules)
	except (OSError, ET.ParseError, KeyError, ValueError, json.JSONDecodeError) as error:
		print("error: {}".format(error), file=sys.stderr)
		return 1
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
