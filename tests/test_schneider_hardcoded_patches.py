import importlib.util
import json
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

from lxml import etree as ET


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "update-scl-for-ples.py"
SPEC = importlib.util.spec_from_file_location("scl_patcher", SCRIPT_PATH)
PATCHER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PATCHER)

SCL_XML = """<SCL xmlns="urn:iec:61850:2003:SCL">
  <IED name="SchneiderIED" manufacturer="Schneider-Electric">
    <AccessPoint name="AP1"><Server><LDevice inst="LD0">
      <LN lnClass="LLN0" inst="">
        <DOI name="IntrfNo"><DAI name="setVal"><Val>OldNetwork</Val></DAI></DOI>
                <DOI name="PTPSIntrfNo"><DAI name="setVal"><Val/></DAI></DOI>
                <DOI name="IntrfNo"><DAI name="setVal"/></DOI>
      </LN>
      <LN lnClass="LSVS" inst="1">
        <DOI name="SvCBRef"><DAI name="setSrcRef"><Val>LD0/GOOSE/.</Val></DAI></DOI>
      </LN>
      <LN lnClass="LGOS" inst="1">
        <DOI name="SvCBRef"><DAI name="setSrcRef"><Val>LD0/Reports/.</Val></DAI></DOI>
      </LN>
      <LN lnClass="GGIO" inst="1">
        <DOI name="SvCBRef"><DAI name="setSrcRef"><Val>LD0/Other/.</Val></DAI></DOI>
      </LN>
    </LDevice></Server></AccessPoint>
  </IED>
  <IED name="OtherVendor" manufacturer="Other">
    <AccessPoint name="AP1"><Server><LDevice inst="LD0"><LN lnClass="LSVS" inst="1">
      <DOI name="PTPSIntrfNo"><DAI name="setVal"><Val>KeepMe</Val></DAI></DOI>
      <DOI name="SvCBRef"><DAI name="setSrcRef"><Val>LD0/GOOSE/.</Val></DAI></DOI>
    </LN></LDevice></Server></AccessPoint>
  </IED>
</SCL>"""

CLIENTLN_SCD_XML = """<SCL xmlns="urn:iec:61850:2003:SCL">
  <Communication><SubNetwork name="StationBus">
    <ConnectedAP iedName="ClientC" apName="AP1"/>
    <ConnectedAP iedName="ClientA" apName="AP1"/>
    <ConnectedAP iedName="ClientB" apName="AP1"/>
  </SubNetwork></Communication>
  <IED name="Schneider" manufacturer="Schneider-Electric">
    <AccessPoint name="AP1"><Server><LDevice inst="LD0">
      <LN0 lnClass="LLN0">
        <ReportControl name="First"><RptEnabled>
          <ClientLN iedName="ClientC" ldInst="LD0" lnClass="LLN0"/>
          <ClientLN iedName="ClientA" ldInst="LD0" lnClass="LLN0"/>
        </RptEnabled></ReportControl>
        <ReportControl name="Second"><RptEnabled>
          <ClientLN iedName="ClientA" ldInst="LD0" lnClass="LLN0"/>
          <ClientLN iedName="ClientB" ldInst="LD0" lnClass="LLN0"/>
        </RptEnabled></ReportControl>
      </LN0>
    </LDevice></Server></AccessPoint>
  </IED>
  <IED name="ClientC" manufacturer="Other"/>
  <IED name="ClientA" manufacturer="Other"/>
  <IED name="ClientB" manufacturer="Other"/>
  <IED name="OtherVendor" manufacturer="Other">
    <ReportControl name="Ignored"><ClientLN iedName="ClientB"/>
      <ClientLN iedName="ClientC"/></ReportControl>
  </IED>
</SCL>"""


class SchneiderHardcodedPatchTest(unittest.TestCase):
    def apply_patches(self, extension, hardcoded_patches):
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            source_path = directory / f"source.{extension}"
            output_path = directory / f"output.{extension}"
            source_path.write_text(SCL_XML, encoding="utf-8")
            PATCHER.process_file(source_path, output_path, [], hardcoded_patches)
            return ET.parse(str(output_path))

    def test_scd_interface_values_and_all_file_references(self):
        result = self.apply_patches("scd", {
            "schneider-redundant-ethernet": {
                "enabled": True,
                "extensions": ["scd"],
            },
            "schneider-sv-cb-ref-normalization": True,
        })

        self.assertEqual(
            result.xpath("string(//*[local-name()='IED' and @name='SchneiderIED']//*[local-name()='DOI' and @name='IntrfNo']//*[local-name()='Val'])"),
            "OldNetwork",
        )
        self.assertEqual(
            result.xpath("string(//*[local-name()='IED' and @name='SchneiderIED']//*[local-name()='DOI' and @name='PTPSIntrfNo']//*[local-name()='Val'])"),
            "RedundantEthernet",
        )
        self.assertEqual(
            result.xpath("string((//*[local-name()='IED' and @name='SchneiderIED']//*[local-name()='DOI' and @name='IntrfNo'])[2]//*[local-name()='Val'])"),
            "RedundantEthernet",
        )
        self.assertEqual(
            result.xpath("string(//*[local-name()='LN' and @lnClass='LSVS']//*[local-name()='DOI' and @name='SvCBRef']//*[local-name()='Val'])"),
            "LD0/GOOSE/LLN0.",
        )
        self.assertEqual(
            result.xpath("string(//*[local-name()='LN' and @lnClass='LGOS']//*[local-name()='DOI' and @name='SvCBRef']//*[local-name()='Val'])"),
            "LD0/Reports/LLN0.",
        )
        self.assertEqual(
            result.xpath("string(//*[local-name()='LN' and @lnClass='GGIO']//*[local-name()='DOI' and @name='SvCBRef']//*[local-name()='Val'])"),
            "LD0/Other/.",
        )
        self.assertEqual(
            result.xpath("string(//*[local-name()='IED' and @name='OtherVendor']//*[local-name()='DOI' and @name='PTPSIntrfNo']//*[local-name()='Val'])"),
            "KeepMe",
        )

    def test_interface_patch_is_scd_only_but_reference_patch_applies_to_icd(self):
        result = self.apply_patches("icd", {
            "schneider-redundant-ethernet": {
                "enabled": True,
                "extensions": ["scd"],
            },
            "schneider-sv-cb-ref-normalization": True,
        })

        self.assertEqual(
            result.xpath("string(//*[local-name()='IED' and @name='SchneiderIED']//*[local-name()='DOI' and @name='IntrfNo']//*[local-name()='Val'])"),
            "OldNetwork",
        )
        self.assertEqual(
            result.xpath("string(//*[local-name()='LN' and @lnClass='LSVS']//*[local-name()='DOI' and @name='SvCBRef']//*[local-name()='Val'])"),
            "LD0/GOOSE/LLN0.",
        )

    def test_both_hardcoded_patches_can_be_disabled(self):
        result = self.apply_patches("scd", {
            "schneider-redundant-ethernet": {"enabled": False, "extensions": ["scd"]},
            "schneider-sv-cb-ref-normalization": False,
        })

        self.assertEqual(
            result.xpath("string(//*[local-name()='IED' and @name='SchneiderIED']//*[local-name()='DOI' and @name='IntrfNo']//*[local-name()='Val'])"),
            "OldNetwork",
        )
        self.assertEqual(
            result.xpath("string(//*[local-name()='LN' and @lnClass='LSVS']//*[local-name()='DOI' and @name='SvCBRef']//*[local-name()='Val'])"),
            "LD0/GOOSE/.",
        )

    def apply_clientln_patch(self, xml=CLIENTLN_SCD_XML, extension="scd",
                             configure_patch=True):
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            source_path = directory / f"source.{extension}"
            output_path = directory / f"output.{extension}"
            source_path.write_text(xml, encoding="utf-8")
            hardcoded_patches = {
                "schneider-clientln-order": {
                    "enabled": True,
                    "extensions": ["scd"],
                },
            } if configure_patch else {}
            PATCHER.process_file(
                source_path, output_path, [], hardcoded_patches)
            return ET.parse(str(output_path))

    def test_clientln_order_is_preserved_and_ied_references_are_renamed(self):
        result = self.apply_clientln_patch()
        ied_names = result.xpath(
            "//*[local-name()='IED']/@name")
        self.assertIn("A_ClientC", ied_names)
        self.assertIn("B_ClientA", ied_names)
        self.assertIn("C_ClientB", ied_names)

        for report_name, expected_clients in (
            ("First", ["A_ClientC", "B_ClientA"]),
            ("Second", ["B_ClientA", "C_ClientB"]),
        ):
            actual_clients = result.xpath(
                "//*[local-name()='IED' and @name='Schneider']"
                "//*[local-name()='ReportControl' and @name=$name]"
                "//*[local-name()='ClientLN']/@iedName",
                name=report_name,
            )
            self.assertEqual(actual_clients, expected_clients)

        connected_names = result.xpath(
            "//*[local-name()='ConnectedAP']/@iedName")
        self.assertEqual(
            connected_names,
            ["A_ClientC", "B_ClientA", "C_ClientB"])
        ignored_clients = result.xpath(
            "//*[local-name()='IED' and @name='OtherVendor']"
            "//*[local-name()='ClientLN']/@iedName")
        self.assertEqual(ignored_clients, ["C_ClientB", "A_ClientC"])

    def test_clientln_order_patch_is_idempotent(self):
        first_result = self.apply_clientln_patch()
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            first_path = directory / "first.scd"
            second_path = directory / "second.scd"
            first_result.write(str(first_path), encoding="utf-8")
            PATCHER.process_file(first_path, second_path, [], {
                "schneider-clientln-order": {
                    "enabled": True,
                    "extensions": ["scd"],
                },
            })
            second_result = ET.parse(str(second_path))
        self.assertEqual(
            second_result.xpath("//*[local-name()='IED']/@name"),
            first_result.xpath("//*[local-name()='IED']/@name"),
        )

    def test_clientln_order_patch_rejects_conflicting_lists(self):
        conflicting_xml = CLIENTLN_SCD_XML.replace(
            "      </LN0>",
            '        <ReportControl name="Conflict"><RptEnabled>'
            '<ClientLN iedName="ClientA" ldInst="LD0" lnClass="LLN0"/>'
            '<ClientLN iedName="ClientC" ldInst="LD0" lnClass="LLN0"/>'
            '</RptEnabled></ReportControl>\n      </LN0>',
        )
        with self.assertRaisesRegex(ValueError, "conflicting IED order"):
            self.apply_clientln_patch(conflicting_xml)

    def test_clientln_order_patch_uses_wide_prefixes_and_avoids_collisions(self):
        names = ["Client{:02d}".format(index) for index in range(27)]
        list_items = "".join(
            '<ClientLN iedName="{}"/>'.format(name) for name in names)
        ieds = "".join(
            '<IED name="{}" manufacturer="Other"/>'.format(name)
            for name in names)
        xml = (
            '<SCL><IED name="Schneider" manufacturer="Schneider-Electric">'
            '<ReportControl><RptEnabled>{}</RptEnabled></ReportControl>'
            '</IED>{}</SCL>'
        ).format(list_items, ieds)
        result = self.apply_clientln_patch(xml)
        renamed = result.xpath(
            "//*[local-name()='IED']/@name")
        self.assertIn("AA_Client00", renamed)
        self.assertIn("BA_Client26", renamed)
        self.assertEqual(
            result.xpath(
                "//*[local-name()='ClientLN']/@iedName")[0],
            "AA_Client00",
        )

        collision_xml = CLIENTLN_SCD_XML.replace(
            '<IED name="ClientC" manufacturer="Other"/>',
            '<IED name="A_ClientC" manufacturer="Other"/>'
            '<IED name="ClientC" manufacturer="Other"/>',
        )
        collision_result = self.apply_clientln_patch(collision_xml)
        self.assertIn(
            "A__ClientC",
            collision_result.xpath("//*[local-name()='IED']/@name"),
        )

    def test_clientln_order_output_validates_against_scl_schema(self):
        fixture_directory = Path(__file__).resolve().parent / "fixtures"
        tree = ET.parse(str(fixture_directory / "TestCase1.ssd"))
        root = tree.getroot()
        namespace = ET.QName(root).namespace
        tag = lambda name: "{{{}}}{}".format(namespace, name)
        first_ied = root.xpath("//*[local-name()='IED' and @name='B1']")[0]
        first_ied.set("manufacturer", "Schneider-Electric")
        long_client_name = "ClientC" + "X" * 57
        client_names = {
            "ClientC": long_client_name,
            "ClientA": "ClientA",
            "ClientB": "ClientB",
        }
        root.xpath("//*[local-name()='LNode']")[0].set(
            "iedName", long_client_name)
        for client_name in ("ClientC", "ClientA", "ClientB"):
            client_ied = deepcopy(first_ied)
            client_ied.set("name", client_names[client_name])
            client_ied.attrib.pop("manufacturer", None)
            for report_control in client_ied.xpath(
                    ".//*[local-name()='ReportControl']"):
                report_control.getparent().remove(report_control)
            root.insert(root.index(first_ied) + 1, client_ied)

        ln0 = first_ied.xpath(".//*[local-name()='LN0']")[0]
        for index, names in enumerate((("ClientC", "ClientA"),
                                       ("ClientA", "ClientB"))):
            report_control = ET.SubElement(
                ln0, tag("ReportControl"), name="RC{}".format(index),
                confRev="1")
            ET.SubElement(report_control, tag("OptFields"))
            enabled = ET.SubElement(report_control, tag("RptEnabled"))
            for name in names:
                ET.SubElement(
                    enabled, tag("ClientLN"),
                    iedName=client_names[name], ldInst="LD0",
                    lnClass="LLN0", lnInst="")

        communication = ET.Element(tag("Communication"))
        subnet = ET.SubElement(
            communication, tag("SubNetwork"), name="StationBus")
        for name in client_names.values():
            ET.SubElement(
                subnet, tag("ConnectedAP"), iedName=name, apName="AP1")
        root.insert(root.index(first_ied), communication)

        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            source_path = directory / "source.scd"
            output_path = directory / "output.scd"
            tree.write(str(source_path), encoding="utf-8", xml_declaration=True)
            PATCHER.process_file(source_path, output_path, [], {
                "schneider-clientln-order": {
                    "enabled": True,
                    "extensions": ["scd"],
                },
            })
            patched_tree = ET.parse(str(output_path))

        schema = ET.XMLSchema(ET.parse(str(fixture_directory / "SCL.xsd")))
        schema.assertValid(patched_tree)
        self.assertLessEqual(
            max(map(len, patched_tree.xpath("//*[local-name()='IED']/@name"))),
            PATCHER.IED_NAME_MAX_LENGTH,
        )
        long_renamed_name = patched_tree.xpath(
            "string(//*[local-name()='IED'][starts-with(@name, 'A_')]/@name)")
        self.assertEqual(
            patched_tree.xpath("string(//*[local-name()='LNode']/@iedName)"),
            long_renamed_name,
        )

    def test_clientln_order_patch_only_runs_for_scd(self):
        result = self.apply_clientln_patch(
            extension="icd", configure_patch=False)
        self.assertIn(
            "ClientC",
            result.xpath("//*[local-name()='IED']/@name"),
        )
        self.assertNotIn(
            "A_ClientC",
            result.xpath("//*[local-name()='IED']/@name"),
        )


class DeleteLNodesWithoutLDeviceTest(unittest.TestCase):
    def apply_patch(self, extension="scd"):
        xml = """<SCL xmlns="urn:iec:61850:2003:SCL">
          <Substation name="Substation1">
            <VoltageLevel name="VoltageLevel1">
              <Bay name="Bay1">
                <LNode iedName="NoDevice" ldInst="LD0" lnClass="LLN0"/>
                <LNode iedName="HasDevice" ldInst="LD0" lnClass="LLN0"/>
                <LNode iedName="HasDevice" ldInst="LD1" lnClass="LLN0"/>
                <LNode iedName="MissingIED" ldInst="LD0" lnClass="LLN0"/>
                <LNode ldInst="LD0" lnClass="LLN0"/>
              </Bay>
            </VoltageLevel>
          </Substation>
          <IED name="NoDevice">
            <AccessPoint name="AP1"><Server/></AccessPoint>
          </IED>
          <IED name="HasDevice" manufacturer="OtherVendor">
            <AccessPoint name="AP1"><Server><LDevice inst="LD0"/></Server></AccessPoint>
          </IED>
        </SCL>"""
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            source_path = directory / f"source.{extension}"
            output_path = directory / f"output.{extension}"
            source_path.write_text(xml, encoding="utf-8")
            PATCHER.process_file(source_path, output_path, [], {
                "delete-lnodes-without-ldevice": {
                    "enabled": True,
                    "extensions": ["scd"],
                },
            })
            return ET.parse(str(output_path))

    def test_deletes_lnodes_without_matching_ldevice_on_any_ied(self):
        result = self.apply_patch()
        lnodes = result.xpath("//*[local-name()='LNode']")
        self.assertEqual(
            [(lnode.get("iedName"), lnode.get("ldInst")) for lnode in lnodes],
            [("HasDevice", "LD0"), ("MissingIED", "LD0"), (None, "LD0")],
        )

    def test_patch_is_filtered_to_scd_inputs(self):
        result = self.apply_patch(extension="icd")
        self.assertEqual(
            result.xpath("//*[local-name()='LNode']/@iedName"),
            ["NoDevice", "HasDevice", "HasDevice", "MissingIED"],
        )

    def test_patch_is_enabled_for_scd_in_published_rules(self):
        repository_root = Path(__file__).resolve().parents[1]
        with (repository_root / "public" / "ples-iop-rules.json").open(
                encoding="utf-8") as rules_file:
            rules = json.load(rules_file)
        self.assertEqual(
            rules["hardcodedPatches"]["delete-lnodes-without-ldevice"],
            {"enabled": True, "extensions": ["scd"]},
        )


if __name__ == "__main__":
    unittest.main()