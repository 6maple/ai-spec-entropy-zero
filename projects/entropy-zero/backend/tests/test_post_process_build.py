import unittest

from app.agent.post_process import build_processor_success
from app.agent.structured_schemas import (
    LLMAgentOutput,
    LLMCardQuestion,
    LLMClaimItem,
    LLMMetaTag,
    LLMNoteItem,
)


class TestPostProcessBuild(unittest.TestCase):
    def test_build_concat_answer(self) -> None:
        raw = LLMAgentOutput(
            meta_tag=LLMMetaTag(domain="前端", topics=["CSS", "布局"]),
            notes=[
                LLMNoteItem(
                    claim_type="concept_definition",
                    title="试标题",
                    abstract="摘要",
                    claims=[
                        LLMClaimItem(
                            p_id="",
                            title="BFC",
                            claim="BFC 用于包含浮动。",
                            evidence="原文引用。",
                            anti_patterns=[],
                            card_question=LLMCardQuestion(question="BFC 有什么用？"),
                        )
                    ],
                )
            ],
        )
        ok = build_processor_success(raw, source_lang="zh", source_file="t.md")
        self.assertEqual(ok.meta_tag.domain, "前端")
        self.assertTrue(ok.note_payloads)
        self.assertIn("BFC 用于包含浮动", ok.card_payloads[0].answer)

