import unittest
from unittest.mock import patch

from app.agent.orchestrator import run_agent_processor
from app.services.processor import (
    ProcessorError,
    ProcessorInput,
    run_deterministic_processor,
)


class TestDeterministicRetired(unittest.TestCase):
    def test_returns_structured_error_not_placeholder(self) -> None:
        inp = ProcessorInput(
            raw_id="r1",
            user_id="u1",
            content="hello\nworld",
            file_name="a.md",
        )
        r = run_deterministic_processor(inp)
        self.assertIsInstance(r, ProcessorError)
        self.assertEqual(r.error_code, "DETERMINISTIC_PROCESSOR_RETIRED")

    def test_empty_is_empty_error(self) -> None:
        inp = ProcessorInput(
            raw_id="r1",
            user_id="u1",
            content="   ",
            file_name="a.md",
        )
        r = run_deterministic_processor(inp)
        self.assertIsInstance(r, ProcessorError)
        self.assertEqual(r.error_code, "EMPTY_CONTENT")


class TestRunAgentProcessor(unittest.TestCase):
    def test_exception_maps_to_processor_error(self) -> None:
        inp = ProcessorInput(
            raw_id="r1",
            user_id="u1",
            content="# x\nok",
            file_name="a.md",
        )
        with patch("app.agent.orchestrator.AgentOrchestrator.run", side_effect=RuntimeError("boom")):
            r = run_agent_processor(inp)
        self.assertIsInstance(r, ProcessorError)
        self.assertEqual(r.error_code, "LLM_UNAVAILABLE")
        self.assertIn("boom", r.error_message)
