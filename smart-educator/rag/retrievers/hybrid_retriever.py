import logging
from typing import List, Dict
from .semantic_retriever import SemanticRetriever
from .bm25_retriever import BM25Retriever
from ..schemas import RetrievalChunk

logger = logging.getLogger(__name__)


class HybridRetriever:
    def __init__(self, semantic: SemanticRetriever = None, bm25: BM25Retriever = None):
        self.semantic = semantic or SemanticRetriever()
        self.bm25 = bm25 or BM25Retriever()

    def retrieve(self, query: str, user_id: str, semantic_k: int = 20, bm25_k: int = 20) -> List[RetrievalChunk]:
        sem = self.semantic.retrieve(query=query, user_id=user_id, top_k=semantic_k)
        bm = self.bm25.retrieve(user_id=user_id, query=query, top_k=bm25_k)

        # Merge and deduplicate by vector_id or content
        merged: Dict[str, RetrievalChunk] = {}
        for r in sem + bm:
            key = r.vector_id or r.page_content[:128]
            if key in merged:
                # keep higher score if present
                existing = merged[key]
                if (r.score or 0) > (existing.score or 0):
                    merged[key] = r
            else:
                merged[key] = r

        results = list(merged.values())
        # normalize scores to 0-1 if possible
        scores = [r.score or 0.0 for r in results]
        if scores:
            maxs = max(scores)
            mins = min(scores)
            denom = maxs - mins if maxs != mins else 1.0
            for r in results:
                r.score = ((r.score or 0.0) - mins) / denom

        results.sort(key=lambda x: x.score or 0.0, reverse=True)
        logger.info("Hybrid retrieval merged %d unique candidates for user=%s", len(results), user_id)
        return results
