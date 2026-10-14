import logging
import time
from typing import List, Tuple

from ..retrievers.query_rewriter import QueryRewriter
from ..retrievers.hybrid_retriever import HybridRetriever
from ..retrievers.reranker import CrossEncoderReranker
from ..validators.confidence_validator import ConfidenceValidator
from ..schemas import RetrievalResult, RetrievalChunk
from ..config import SEMANTIC_TOP_K, BM25_TOP_K, FINAL_TOP_K
from ..exceptions import RetrievalError

logger = logging.getLogger(__name__)


class RetrievalService:
    def __init__(self, hybrid: HybridRetriever = None, reranker: CrossEncoderReranker = None):
        self.rewriter = QueryRewriter()
        self.hybrid = hybrid or HybridRetriever()
        self.reranker = reranker or CrossEncoderReranker()

    def retrieve(self, user, raw_query: str, chat_history: List[dict] = None) -> RetrievalResult:
        start = time.time()
        try:
            rewritten = self.rewriter.rewrite(raw_query, chat_history)
            logger.info('Query rewritten: %s', rewritten)

            candidates: List[RetrievalChunk] = self.hybrid.retrieve(query=rewritten, user_id=str(user.id), semantic_k=SEMANTIC_TOP_K, bm25_k=BM25_TOP_K)
            logger.info('Hybrid retrieval fetched %d candidates', len(candidates))

            # Rerank
            reranked = self.reranker.rerank(query=rewritten, candidates=candidates, top_k=FINAL_TOP_K)
            logger.info('Reranking completed, top_k=%d', FINAL_TOP_K)

            # Confidence validation
            confidence = ConfidenceValidator.evaluate(reranked)
            logger.info('Confidence validation passed: %.4f', confidence)

            reranked_chunks = []
            retrieval_scores = []
            for c, s in reranked:
                c.score = s
                reranked_chunks.append(c)
                retrieval_scores.append(s)

            elapsed = time.time() - start
            result = RetrievalResult(
                rewritten_query=rewritten,
                retrieved_chunks=candidates,
                reranked_chunks=reranked_chunks,
                retrieval_scores=retrieval_scores,
                confidence_score=confidence,
                retrieval_time=elapsed,
                metadata={'user_id': str(user.id)},
                retrieval_status='SUCCESS',
            )
            logger.info('Retrieval finished in %.3fs', elapsed)
            return result

        except Exception as e:
            logger.exception('Retrieval failed')
            raise RetrievalError(str(e))
