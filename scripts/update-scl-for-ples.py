#!/usr/bin/env python3
"""Apply configurable XML rules to an IEC 61850 SCL/SCD file.

Rules are JSON objects with one of these actions:
  {"action": "set-attribute", "xpath": "//{*}IED", "name": "name", "value": "new"}
  {"action": "set-text", "xpath": "//{*}Private", "value": "text"}
  {"action": "delete", "xpath": "//{*}Private"}
  {"action": "add-attribute", "xpath": "//{*}IED", "name": "x", "value": "y"}
	{"action": "rename-data-type-template-id", "search": "old", "replace": "new"}

The XPath uses ElementTree syntax.  ``{*}`` can be used to match elements in
any namespace, which is useful for SCL files.
"""

import argparse
from copy import deepcopy
from datetime import datetime
import glob
import json
import sys
from pathlib import Path

from lxml import etree as ET


def elements(root, xpath):
	"""Evaluate XPath while accepting the convenient //{*}tag notation."""
	if xpath.startswith("//{*}"):
		tag = xpath[5:]
		return [element for element in root.iter()
				if element.tag.rsplit("}", 1)[-1] == tag]
	return root.getroottree().xpath(xpath)


def parent_map(root):
	return {child: parent for parent in root.iter() for child in parent}


def element_path(root, element):
	parts = []
	current = element
	while current is not None:
		label = current.tag.rsplit("}", 1)[-1]
		if label == "LDevice":
			identifier = current.get("ldInst")
		elif label in ("LN", "LN0"):
			ln_inst = current.get("lnInst") or current.get("inst")
			identifier = "".join(value for value in (
				current.get("prefix"), current.get("lnClass"), ln_inst)
				if value)
		else:
			identifier = current.get("name") or current.get("id")
		if identifier:
			label = "{}({})".format(label, identifier)
		parts.append(label)
		if current is root:
			break
		current = current.getparent()
	return "/".join(reversed(parts))


def expand_single_val_sgroups(root):
	"""Duplicate an ungrouped Val under applicable DA elements for groups 1-8."""
	patched_paths = []
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
		patched_paths.append(element_path(root, da))
	return patched_paths


def add_empty_lpl_das(root):
	"""Add the standard DA children to empty LPL data object types."""
	da_attributes = (
		("vendor", "VisString255", "DC"),
		("swRev", "VisString255", "DC"),
		("configRev", "VisString255", "DC"),
		("ldNs", "VisString255", "EX"),
	)
	patched_paths = []
	for do_type in root.iter():
		if (do_type.tag.rsplit("}", 1)[-1] != "DOType" or
			do_type.get("cdc") != "LPL" or len(do_type) != 0):
			continue

		namespace = ET.QName(do_type).namespace
		da_tag = "{{{}}}DA".format(namespace) if namespace else "DA"
		for name, b_type, functional_constraint in da_attributes:
			ET.SubElement(do_type, da_tag, name=name, bType=b_type,
						fc=functional_constraint)
		patched_paths.append(element_path(root, do_type))
	return patched_paths


def remove_unused_data_type_templates(root):
	"""Remove data type templates that are unreachable from logical nodes."""
	template_names = {"LNodeType", "DOType", "DAType", "EnumType"}
	data_type_templates = [element for element in root.iter()
						   if element.tag.rsplit("}", 1)[-1] == "DataTypeTemplates"]
	definitions = [child for container in data_type_templates for child in container
				if child.tag.rsplit("}", 1)[-1] in template_names]
	removed_paths = []

	def remove_unused(template_definitions, used_ids):
		for definition in template_definitions:
			identifier = definition.get("id")
			if identifier is not None and identifier not in used_ids:
				removed_paths.append(element_path(root, definition))
				definition.getparent().remove(definition)

	def definitions_by_id(template_definitions):
		by_id = {}
		for definition in template_definitions:
			identifier = definition.get("id")
			if identifier is not None:
				by_id.setdefault(identifier, []).append(definition)
		return by_id

	lnode_types = [definition for definition in definitions
				   if definition.tag.rsplit("}", 1)[-1] == "LNodeType"]
	used_lnode_types = {
		element.get("lnType")
		for element in root.iter()
		if (element.tag.rsplit("}", 1)[-1] in ("LN", "LN0", "LNode") and
			element.get("lnType") is not None)
	}
	remove_unused(lnode_types, used_lnode_types)
	live_lnode_types = [definition for definition in lnode_types
						if definition.getparent() is not None]

	do_types = [definition for definition in definitions
				if definition.tag.rsplit("}", 1)[-1] == "DOType"]
	do_types_by_id = definitions_by_id(do_types)
	used_do_types = set()
	for lnode_type in live_lnode_types:
		used_do_types.update(child.get("type") for child in lnode_type
							 if child.tag.rsplit("}", 1)[-1] == "DO" and
							 child.get("type") is not None)

	# Keep nested SDO types reachable from DO references in used LNodeTypes.
	pending_do_types = list(used_do_types)
	while pending_do_types:
		identifier = pending_do_types.pop()
		for do_type in do_types_by_id.get(identifier, []):
			for child in do_type:
				if (child.tag.rsplit("}", 1)[-1] == "SDO" and
					child.get("type") is not None and
					child.get("type") not in used_do_types):
					used_do_types.add(child.get("type"))
					pending_do_types.append(child.get("type"))
	remove_unused(do_types, used_do_types)
	live_do_types = [definition for definition in do_types
					 if definition.getparent() is not None]

	structured_types = [definition for definition in definitions
						if definition.tag.rsplit("}", 1)[-1] in ("DAType", "EnumType")]
	structured_types_by_id = definitions_by_id(structured_types)
	used_structured_types = set()
	for do_type in live_do_types:
		for child in do_type:
			if (child.tag.rsplit("}", 1)[-1] == "DA" and
				child.get("type") in structured_types_by_id):
				used_structured_types.add(child.get("type"))

	# Keep BDA dependencies reachable from used DAType definitions.
	pending_structured_types = list(used_structured_types)
	while pending_structured_types:
		identifier = pending_structured_types.pop()
		for structured_type in structured_types_by_id.get(identifier, []):
			if structured_type.tag.rsplit("}", 1)[-1] != "DAType":
				continue
			for child in structured_type:
				if (child.tag.rsplit("}", 1)[-1] == "BDA" and
					child.get("type") in structured_types_by_id and
					child.get("type") not in used_structured_types):
					used_structured_types.add(child.get("type"))
					pending_structured_types.append(child.get("type"))
	remove_unused(structured_types, used_structured_types)
	return removed_paths


def rename_data_type_template_id(root, rule):
	"""Rename a template ID and its SCL-defined references exactly."""
	template_types = {
		"LNodeType", "DOType", "DAType", "EnumType"
	}
	requested_types = rule.get("templateTypes", template_types)
	if (not isinstance(requested_types, (list, set, tuple)) or
		any(not isinstance(template_type, str) for template_type in requested_types)):
		raise ValueError("templateTypes must be a list of template names")
	selected_types = set(requested_types)
	if not selected_types or not selected_types.issubset(template_types):
		raise ValueError("templateTypes must contain valid data type template names")
	search = str(rule["search"])
	replacement = str(rule["replace"])
	if not search or not replacement:
		raise ValueError("template ID search and replacement values must be non-empty")
	if search == replacement:
		return []

	data_type_templates = [element for element in root.iter()
						   if element.tag.rsplit("}", 1)[-1] == "DataTypeTemplates"]
	definitions = [child for templates in data_type_templates for child in templates
				if (child.tag.rsplit("}", 1)[-1] in selected_types and
					child.get("id") == search)]
	if not definitions:
		if rule.get("required", False):
			raise ValueError("data type template ID not found: {}".format(search))
		return []

	all_definitions = [child for templates in data_type_templates for child in templates
				   if child.tag.rsplit("}", 1)[-1] in template_types]
	if any(definition.get("id") == replacement and definition not in definitions
		   for definition in all_definitions):
		raise ValueError("data type template ID already exists: {}".format(replacement))

	matched_types = {definition.tag.rsplit("}", 1)[-1]
					 for definition in definitions}
	patches = []
	for definition in definitions:
		patches.append(element_path(root, definition))
		definition.set("id", replacement)

	for element in root.iter():
		local_name = element.tag.rsplit("}", 1)[-1]
		parent = element.getparent()
		parent_name = parent.tag.rsplit("}", 1)[-1] if parent is not None else ""
		reference_attribute = None
		if ("DOType" in matched_types and local_name == "DO" and
			parent_name == "LNodeType" and element.get("type") == search):
			reference_attribute = "type"
		elif ("DOType" in matched_types and local_name == "SDO" and
			  parent_name == "DOType" and element.get("type") == search):
			reference_attribute = "type"
		elif (matched_types.intersection({"DAType", "EnumType"}) and
			  ((local_name == "DA" and parent_name == "DOType") or
			   (local_name == "BDA" and parent_name == "DAType")) and
			  element.get("type") == search):
			reference_attribute = "type"
		elif ("LNodeType" in matched_types and local_name in ("LN", "LN0", "LNode")
			  and element.get("lnType") == search):
			reference_attribute = "lnType"
		if reference_attribute:
			patches.append(element_path(root, element))
			element.set(reference_attribute, replacement)
	return patches


def apply_rule(root, rule):
	action = rule.get("action")
	if action == "rename-data-type-template-id":
		return rename_data_type_template_id(root, rule)
	matches = elements(root, rule["xpath"])
	if not matches:
		if rule.get("required", False):
			raise ValueError("rule matched no elements: {}".format(rule["xpath"]))
		return []
	if action == "replace":
		target = rule.get("target", "text")
		search = str(rule["search"])
		replacement = str(rule.get("replace", ""))
		patched_paths = []
		for element in matches:
			if target == "text":
				value = element.text
				if value is not None and search in value:
					element.text = value.replace(search, replacement)
					patched_paths.append(element_path(root, element))
			elif target == "attribute":
				attribute = rule["attribute"]
				value = element.get(attribute)
				if value is not None and search in value:
					element.set(attribute, value.replace(search, replacement))
					patched_paths.append(element_path(root, element))
			else:
				raise ValueError("unsupported replace target: {}".format(target))
		return patched_paths
	if action == "replace-ancestor-attribute":
		ancestor_tag = rule.get("ancestor", "IED")
		attribute = rule["attribute"]
		replacement = str(rule.get("replace", ""))
		patched_paths = []
		for element in matches:
			ancestor = element.getparent()
			while (ancestor is not None and
				ancestor.tag.rsplit("}", 1)[-1] != ancestor_tag):
				ancestor = ancestor.getparent()
			if ancestor is None:
				continue
			search = ancestor.get(attribute)
			value = element.text
			if search and value is not None and search in value:
				element.text = value.replace(search, replacement)
				patched_paths.append(element_path(root, element))
		return patched_paths

	matched_paths = [element_path(root, element) for element in matches]
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
	return matched_paths


def rule_applies_to_file(rule, input_path):
	extensions = rule.get("extensions")
	if not extensions:
		return True
	allowed_extensions = {
		str(extension).lower().lstrip(".") for extension in extensions
	}
	return input_path.suffix.lower().lstrip(".") in allowed_extensions


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


def write_patch_log(log_path, input_path, output_path, patches):
	with log_path.open("a", encoding="utf-8") as stream:
		stream.write("{}\n".format(datetime.now().isoformat(timespec="seconds")))
		stream.write("Input: {}\n".format(input_path.resolve()))
		stream.write("Output: {}\n".format(output_path.resolve()))
		if patches:
			stream.write("Patches:\n")
			for patch in patches:
				stream.write("- {}\n".format(patch))
		else:
			stream.write("Patches: none\n")
		stream.write("\n")


def process_file(input_path, output_path, rules):
	tree = parse_xml(input_path)
	patches = []
	if input_path.suffix.lower() in (".icd", ".iid"):
		for path in remove_unused_data_type_templates(tree.getroot()):
			patches.append("remove-unused-data-type-template: {}".format(path))
	for path in add_empty_lpl_das(tree.getroot()):
		patches.append("add-empty-lpl-das: {}".format(path))
	for path in expand_single_val_sgroups(tree.getroot()):
		patches.append("expand-single-val-sgroups: {}".format(path))
	for rule in rules:
		if not rule_applies_to_file(rule, input_path):
			continue
		for path in apply_rule(tree.getroot(), rule):
			if rule.get("action") == "replace":
				target = rule.get("target", "text")
				if target == "attribute":
					target = "attribute:{}".format(rule["attribute"])
				patches.append("rule replace [{}] {!r} -> {!r}: {}".format(
					target, rule["search"], rule.get("replace", ""), path))
			elif rule.get("action") == "set-text":
				patches.append("rule set-text {!r}: {}".format(
					rule.get("value", ""), path))
			elif rule.get("action") == "replace-ancestor-attribute":
				patches.append("rule replace ancestor {}.{} -> {!r}: {}".format(
					rule.get("ancestor", "IED"), rule["attribute"],
					rule.get("replace", ""), path))
			elif rule.get("action") == "rename-data-type-template-id":
				patches.append("rule rename data type template ID {!r} -> {!r}: {}".format(
					rule["search"], rule["replace"], path))
			else:
				patches.append("rule {} ({}): {}".format(
					rule.get("action"), rule["xpath"], path))
	ET.indent(tree, space="  ")
	tree.write(output_path, encoding="utf-8", xml_declaration=True)
	return patches


def main():
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("input", help="source SCL/SCD file or wildcard pattern")
	parser.add_argument("output", type=Path, nargs="?",
					help="patched SCD file (default: input name with _patched suffix)")
	parser.add_argument("--in-place", action="store_true",
					help="overwrite each input file instead of creating a patched file")
	parser.add_argument("--rules", type=Path, help="JSON file containing a rule list")
	parser.add_argument("--rule", action="append", default=[],
						help="one JSON rule; may be specified repeatedly")
	args = parser.parse_args()

	try:
		input_paths = [Path(path) for path in sorted(glob.glob(args.input))]
		if not input_paths:
			raise ValueError("input pattern matched no files: {}".format(args.input))
		if args.in_place and args.output:
			raise ValueError("--in-place cannot be combined with an explicit output path")
		if args.output and len(input_paths) > 1:
			raise ValueError("an explicit output path requires exactly one input file")

		rules = load_rules(args)
		log_path = Path("patch.log")
		for input_path in input_paths:
			output = input_path if args.in_place else args.output or input_path.with_name(
				input_path.stem + "_patched" + input_path.suffix)
			patches = process_file(input_path, output, rules)
			write_patch_log(log_path, input_path, output, patches)
	except (OSError, ET.ParseError, KeyError, ValueError, json.JSONDecodeError) as error:
		print("error: {}".format(error), file=sys.stderr)
		return 1
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
