from __future__ import annotations

from app.agent.llm_router import LLMRouter
from app.agent.schemas import FlashcardPayload, NoteBundle


_ERROR_KEYWORDS = ("而不是", "不应该", "应避免", "instead of", "avoid", "never")


def generate_cards_for_note(note: NoteBundle, router: LLMRouter) -> list[FlashcardPayload]:
    payload = {
        "note_title": note.title,
        "claims": [
            {
                "claim_id": claim.claim_id,
                "topic": claim.topic,
                "assertion": claim.assertion,
                "evidence": claim.evidence.description,
            }
            for claim in note.claims
        ],
    }
    raw = router.call("card_generation", payload)
    cards = raw.get("cards", [])
    if len(cards) != len(note.claims):
        raise ValueError("card_count_mismatch")

    result: list[FlashcardPayload] = []
    for i, (card, claim) in enumerate(zip(cards, note.claims), start=1):
        card_type = _decide_card_type(claim.assertion, claim.evidence.description)
        result.append(
            FlashcardPayload(
                point_id=f"p_{i}",
                question=card.get("question", f"{claim.topic} 的关键机制是什么？"),
                answer=card.get("answer", f"{claim.assertion}\n\n{claim.evidence.description}").strip(),
                card_type=card_type,
                explanation=card.get("explanation"),
                claim_ref=claim.claim_id,
            )
        )
    return result


def _decide_card_type(assertion: str, evidence_text: str) -> str:
    lowered = assertion.lower()
    if any(k in assertion or k in lowered for k in _ERROR_KEYWORDS):
        return "error_correction"
    if "```" in evidence_text:
        return "fill_in_blank"
    return "qa"

