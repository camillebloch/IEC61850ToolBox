import importlib.util
import json
import unittest
from pathlib import Path

from lxml import etree as ET


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPOSITORY_ROOT / "scripts" / "update-scl-for-ples.py"
RULES_PATH = REPOSITORY_ROOT / "public" / "ples-iop-rules.json"
SPEC = importlib.util.spec_from_file_location("scl_patcher", SCRIPT_PATH)
PATCHER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PATCHER)


class DeleteDuplicatesRuleTest(unittest.TestCase):
    def test_keeps_first_element_per_exact_attribute_pair(self):
        with RULES_PATH.open(encoding="utf-8") as rules_file:
            configured_rules = json.load(rules_file)["rules"]
        rule = next(
            rule for rule in configured_rules
            if rule.get("action") == "delete-duplicates"
        )
        self.assertEqual(rule["xpath"], "//*[local-name()='Hitem']")
        self.assertEqual(rule["attributes"], ["version", "revision"])

        root = ET.fromstring(
            """<SCL>
              <Header>
                <Hitem version="1" revision="A" id="keep-first"/>
                <Hitem version="1" revision="A" id="remove-duplicate"/>
                <Hitem version="1" revision="B" id="keep-revision"/>
                <Hitem version="2" revision="A" id="keep-version"/>
                <Hitem version="1" revision="a" id="keep-case-distinct"/>
                <Hitem version="1" id="keep-missing-revision"/>
              </Header>
            </SCL>"""
        )
        changed_paths = PATCHER.apply_rule(root, rule)

        remaining_ids = root.xpath(
            "//*[local-name()='Hitem']/@id"
        )
        self.assertEqual(remaining_ids, [
            "keep-first",
            "keep-revision",
            "keep-version",
            "keep-case-distinct",
            "keep-missing-revision",
        ])
        self.assertEqual(len(changed_paths), 1)


if __name__ == "__main__":
    unittest.main()
