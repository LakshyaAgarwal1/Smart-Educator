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
            raise ConfidenceValidationError('No reranked chunks to evaluate')

        scores = [s for (_, s) in reranked]
        highest = max(scores)
        avg = sum(scores) / len(scores)
        confidence = 0.6 * highest + 0.4 * avg
        logger.info('Confidence evaluation highest=%.4f avg=%.4f confidence=%.4f', highest, avg, confidence)
        if confidence < CONFIDENCE_THRESHOLD:
            raise ConfidenceValidationError(f'Confidence {confidence:.3f} below threshold')
        return confidence
