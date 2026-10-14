import logging
import re
from typing import List
from rank_bm25 import BM25Okapi
from ..schemas import RetrievalChunk
from documents.models import DocumentChunk

logger = logging.getLogger(__name__)

INSTRUCTIONAL_STOPWORDS = {
    'what', 'are', 'the', 'in', 'a', 'an', 'is', 'of', 'to', 'for', 'and', 'or',
    'it', 'this', 'that', 'give', 'me', 'tell', 'how', 'do', 'does', 'about',
    'please', 'show', 'all', 'can', 'you', 'i', 'we', 'my', 'your', 'with', 'by',
    'as', 'per', 'on', 'from', 'into', 'which', 'who', 'whom', 'where', 'when',
    # Prompt directives & task verbs
    'create', 'generate', 'write', 'make', 'give', 'prepare', 'design', 'draft',
    'quiz', 'test', 'exam', 'questions', 'question', 'mcq', 'mcqs', 'short', 'long',
    'summary', 'notes', 'flashcards', 'brief', 'comprehensive', 'detailed',
    # Educational meta-words (should not serve as sole topic match)
    'student', 'students', 'class', 'grade', 'standard', 'board', 'syllabus',
    'curriculum', 'topic', 'topics', 'chapter', 'chapters', 'subject', 'school',
    'cbse', 'icse', 'state', 'ncert',
    # Document, file, and vector storage meta-words
    'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'txt', 'csv',
    'file', 'files', 'document', 'documents', 'docs', 'db', 'database',
    'vector', 'vectorized', 'vectorstore', 'uploaded', 'upload', 'folder',
    'drive', 'material', 'materials'
}


def _tokenize(text: str) -> List[str]:
    # Extract alphanumeric and slash-delimited terms, e.g. 7/12, 712, 142
    words = re.findall(r'\b[\w/]+\b', (text or '').lower())
    return [w for w in words if w not in INSTRUCTIONAL_STOPWORDS and (len(w) > 2 or w.isdigit())]


class BM25Retriever:
    def __init__(self):
        pass

    def retrieve(self, user_id: str, query: str, top_k: int = 20) -> List[RetrievalChunk]:
        chunks = list(
            DocumentChunk.objects.filter(
                document__user_id=user_id,
                document__status='PROCESSED'
            ).select_related('document')
        )
        if not chunks:
            return []

        # 1. Expand query aliases
        q_lower = query.lower()
        if re.search(r'7\s*/\s*12|7-12|satbara|sat\s*bara', q_lower):
            q_lower += " 712 7/12 satbara सातबारा गाव_नमुना"

        tokenized_query = _tokenize(q_lower)
        if not tokenized_query:
            tokenized_query = [w for w in query.lower().split() if len(w) > 2]

        subject_tokens = [w for w in tokenized_query if not w.isdigit()]

        # 2. Tokenize corpus chunks + filenames
        tokenized_corpus = []
        for c in chunks:
            combined_text = f"{c.document.filename} {c.content}"
            tokenized_corpus.append(_tokenize(combined_text))

        bm25 = BM25Okapi(tokenized_corpus)
        scores = bm25.get_scores(tokenized_query)

        matching = []
        for i in range(len(chunks)):
            s = float(scores[i])
            content_lower = chunks[i].content.lower()
            fname_lower = chunks[i].document.filename.lower()

            # If the query contains substantive subject tokens, require that the chunk has some topical overlap
            if subject_tokens:
                has_subject_overlap = any(st in content_lower or st in fname_lower for st in subject_tokens)
                if not has_subject_overlap:
                    continue

            has_match = any(w in content_lower or w in fname_lower for w in tokenized_query)
            if s > 0.0 or has_match:
                title_boost = 1.5 if any(w in fname_lower for w in tokenized_query) else 0.0
                raw_score = s + title_boost
                # Normalize BM25 score smoothly to [0.0, 1.0] using sigmoidal scaling
                norm_score = round(raw_score / (raw_score + 8.0), 4)
                if norm_score >= 0.20:
                    matching.append((chunks[i], norm_score))

        if not matching:
            return []

        scored = sorted(matching, key=lambda x: x[1], reverse=True)[:top_k]

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
