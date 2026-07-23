import logging
from typing import List
from rank_bm25 import BM25Okapi
from ..schemas import RetrievalChunk
from documents.models import DocumentChunk

logger = logging.getLogger(__name__)


class BM25Retriever:
    def __init__(self):
        pass

    def retrieve(self, user_id: str, query: str, top_k: int = 20) -> List[RetrievalChunk]:
        chunks = list(DocumentChunk.objects.filter(document__user_id=user_id, document__status='PROCESSED').select_related('document'))
        if not chunks:
            return []

        corpus = [c.content for c in chunks]
        tokenized = [c.lower().split() for c in corpus]
        bm25 = BM25Okapi(tokenized)
        tokenized_query = query.lower().split()
        scores = bm25.get_scores(tokenized_query)

        scored = sorted([(chunks[i], float(scores[i])) for i in range(len(chunks))], key=lambda x: x[1], reverse=True)[:top_k]

        results: List[RetrievalChunk] = []
        for chunk, score in scored:
            md = {
                'document_id': str(chunk.document.id),
                'user_id': str(chunk.document.user.id),
                'title': chunk.document.display_name,
                'filename': chunk.document.filename,
                'chunk_index': chunk.chunk_index,
                'page_number': chunk.page_number,
                'vector_id': chunk.vector_id,
            }
            results.append(RetrievalChunk(page_content=chunk.content, metadata=md, vector_id=chunk.vector_id, score=score))

        logger.info("BM25 retrieved %d candidates for user=%s", len(results), user_id)
        return results
