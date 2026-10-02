import json
import unittest

from fastapi.testclient import TestClient

from api.main import app


class PatchEndpointTest(unittest.TestCase):
    def test_patch_accepts_multipart_form(self):
        client = TestClient(app)
        rules = {
            "hardcodedPatches": {"dummyPatch": True},
            "rules": [],
        }

        with open("tests/fixtures/TestCase1.ssd", "rb") as source_file:
            response = client.post(
                "/patch",
                files={"file": ("TestCase1.ssd", source_file.read(), "application/xml")},
                data={"rules": json.dumps(rules)},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("application/xml", response.headers.get("content-type", ""))


if __name__ == "__main__":
    unittest.main()
