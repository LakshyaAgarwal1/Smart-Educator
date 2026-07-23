import logging
from typing import List, Dict
from ..citation.citation_service import build_citations

logger = logging.getLogger(__name__)


class AnswerValidator:
    @staticmethod
    def validate(answer_text: str, citations: List[Dict]) -> Dict:
        if not answer_text or not answer_text.strip():
            return {'valid': False, 'reason': 'empty_response'}

        if not citations:
            return {'valid': False, 'reason': 'missing_citations'}

        # basic heuristic: if answer contains 'I could not find' allow it
        if "couldn't find" in answer_text.lower() or "could not find" in answer_text.lower():
            return {'valid': True, 'reason': 'insufficient_context'}

        # otherwise accept
        return {'valid': True}
