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


class DeleteAttributeRuleTest(unittest.TestCase):
    def test_pservt_is_deleted_only_from_matching_extrefs(self):
        with RULES_PATH.open(encoding="utf-8") as rules_file:
            rules = json.load(rules_file)["rules"]
        rule = next(rule for rule in rules if rule["action"] == "delete-attribute")

        root = ET.fromstring(
            """<SCL xmlns="urn:iec:61850:2003:SCL">
              <IED type="PowerLogic-P7">
                <ExtRef pServT="GOOSE"/>
                <ExtRef intAddr="x" pServT="KEEP-INTADDR"/>
                <ExtRef intAddr="other" pServT="KEEP-OTHER"/>
                <ExtRef intAddr="x"/>
              </IED>
              <IED type="Other">
                <ExtRef pServT="KEEP-OTHER-IED"/>
              </IED>
            </SCL>"""
        )

        changed_paths = PATCHER.apply_rule(root, rule)

        extrefs = root.xpath("//*[local-name()='ExtRef']")
        self.assertIsNone(extrefs[0].get("pServT"))
        self.assertEqual(extrefs[1].get("pServT"), "KEEP-INTADDR")
        self.assertEqual(extrefs[2].get("pServT"), "KEEP-OTHER")
        self.assertIsNone(extrefs[3].get("pServT"))
        self.assertEqual(extrefs[4].get("pServT"), "KEEP-OTHER-IED")
        self.assertEqual(len(changed_paths), 1)


if __name__ == "__main__":
    unittest.main()
