import logging
from typing import List, Optional, Dict, Any
from ..vectorstore.chroma_wrapper import ChromaWrapper
from ..services.embedding_service import GeminiEmbeddingService
from ..schemas import RetrievalChunk
from documents.models import DocumentChunk

logger = logging.getLogger(__name__)


class SemanticRetriever:
    def __init__(self, store: Optional[ChromaWrapper] = None, embedding_service: Optional[GeminiEmbeddingService] = None):
        self.store = store or ChromaWrapper()
        self.embedding_service = embedding_service or GeminiEmbeddingService()

    def retrieve(self, query: str, user_id: str, top_k: int = 20, score_threshold: float = 0.0) -> List[RetrievalChunk]:
        # create embedding for query
        q_chunk = type('C', (), {'text': query, 'metadata': None})
        embedded = self.embedding_service.embed_batch([q_chunk])
        if not embedded:
            return []
        emb = embedded[0].vector

        raw = self.store.search(query_embedding=emb, n_results=top_k, filter={"user_id": str(user_id)})

        results: List[RetrievalChunk] = []
        if not isinstance(raw, dict):
            return results

        raw_docs = raw.get('documents') or [[]]
        raw_metas = raw.get('metadatas') or [[]]
        raw_ids = raw.get('ids') or [[]]
        raw_dists = raw.get('distances') or [[]]

        docs = raw_docs[0] if raw_docs and isinstance(raw_docs[0], list) else raw_docs
        metadatas = raw_metas[0] if raw_metas and isinstance(raw_metas[0], list) else raw_metas
        ids = raw_ids[0] if raw_ids and isinstance(raw_ids[0], list) else raw_ids
        scores = raw_dists[0] if raw_dists and isinstance(raw_dists[0], list) else raw_dists

        for doc_text, md, vid, dist_raw in zip(docs, metadatas, ids, scores):
            # Chroma returns distance (lower is closer).
            # Convert cosine distance to similarity score in [0.0, 1.0]
            try:
                d = float(dist_raw) if dist_raw is not None else 1.0
                similarity = max(0.0, round(1.0 - d, 4)) if d <= 1.0 else max(0.0, round(1.0 / (1.0 + d), 4))
            except Exception:
                similarity = 0.5

            if score_threshold and similarity < score_threshold:
                continue

            # build RetrievalChunk with similarity score
            rc = RetrievalChunk(page_content=doc_text, metadata=md, vector_id=vid, score=similarity)
            results.append(rc)

        logger.info("Semantic retrieval found %d candidates for user=%s", len(results), user_id)
        return results
