import logging
from typing import List, Tuple
from ..config import CONFIDENCE_THRESHOLD
from ..schemas import RetrievalChunk
from ..exceptions import ConfidenceValidationError

logger = logging.getLogger(__name__)


class ConfidenceValidator:
    @staticmethod
    def evaluate(reranked: List[Tuple[RetrievalChunk, float]]) -> float:
        if not reranked:
            return 0.20

        scores = [s for (_, s) in reranked]
        highest = max(scores)
        avg = sum(scores) / len(scores)

        # If the best matching chunk has weak similarity (< 0.20), low confidence
        if highest < 0.20:
            return 0.25

        confidence = min(0.96, max(0.40, 0.60 * highest + 0.40 * avg + 0.15))
        logger.info('Confidence evaluation highest=%.4f avg=%.4f confidence=%.4f', highest, avg, confidence)
        return confidence

