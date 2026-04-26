"""
AI Service

Placeholder for AI-powered knowledge processing.
Phase 1: Function signatures only, no actual LLM calls.
"""

from typing import List, Dict


class AIService:
    """AI service for processing raw knowledge into notes and flashcards"""

    def __init__(self, api_key: str = None):
        """
        Initialize AI service

        TODO: Initialize LLM client (OpenAI/Anthropic/OpenRouter)
        """
        self.api_key = api_key

    async def process_markdown(self, content: str) -> Dict:
        """
        Process markdown content into structured notes

        Args:
            content: Raw markdown text

        Returns:
            Dict with:
                - title: str
                - abstract: str
                - tags: List[str]
                - points: List[Point]

        TODO: Implement LLM call to extract knowledge points
        """
        raise NotImplementedError("AI processing not implemented in Phase 1")

    async def generate_flashcards(self, point: Dict) -> List[Dict]:
        """
        Generate Q&A flashcards from a knowledge point

        Args:
            point: Dict with p_id, title, body

        Returns:
            List of dicts with:
                - question: str
                - answer: str

        TODO: Implement LLM call to generate Q&A pairs
        """
        raise NotImplementedError("Flashcard generation not implemented in Phase 1")


# Singleton instance
ai_service = AIService()
