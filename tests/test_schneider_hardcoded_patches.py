import importlib.util
import tempfile
import unittest
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


if __name__ == "__main__":
    unittest.main()