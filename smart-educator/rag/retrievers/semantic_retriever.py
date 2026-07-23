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
        emb = self.embedding_service.embed_batch([q_chunk])[0].vector

        raw = self.store.search(query_embedding=emb, n_results=top_k, filter={"user_id": str(user_id)})

        results: List[RetrievalChunk] = []
        # chroma returns dict-like; handle safely
        docs = raw.get('documents', []) if isinstance(raw, dict) else raw
        metadatas = raw.get('metadatas', []) if isinstance(raw, dict) else []
        ids = raw.get('ids', []) if isinstance(raw, dict) else []
        scores = raw.get('distances', []) if isinstance(raw, dict) else []

        for doc_text, md, vid, score in zip(docs, metadatas, ids, scores):
            if score_threshold and score < score_threshold:
                continue
            # build RetrievalChunk
            rc = RetrievalChunk(page_content=doc_text, metadata=md, vector_id=vid, score=score)
            results.append(rc)

        logger.info("Semantic retrieval found %d candidates for user=%s", len(results), user_id)
        return results
