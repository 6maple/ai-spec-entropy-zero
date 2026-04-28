import unittest

from app.agent.claim_type_map import infer_card_type, normalize_claim_type


class TestClaimTypeNormalization(unittest.TestCase):
    def test_core_passthrough(self) -> None:
        t, fixed = normalize_claim_type("pitfall_anti_pattern")
        self.assertEqual(t, "pitfall_anti_pattern")
        self.assertFalse(fixed)

    def test_custom_ok(self) -> None:
        t, fixed = normalize_claim_type("custom:dom_lifecycle")
        self.assertEqual(t, "custom:dom_lifecycle")
        self.assertFalse(fixed)

    def test_invalid_fallback(self) -> None:
        t, fixed = normalize_claim_type("not_a_type")
        self.assertEqual(t, "concept_definition")
        self.assertTrue(fixed)


class TestInferCardType(unittest.TestCase):
    def test_pitfall_is_error_correction(self) -> None:
        self.assertEqual(
            infer_card_type("pitfall_anti_pattern", "x", ""),
            "error_correction",
        )

    def test_default_qa(self) -> None:
        self.assertEqual(
            infer_card_type("concept_definition", "short claim", ""),
            "qa",
        )
