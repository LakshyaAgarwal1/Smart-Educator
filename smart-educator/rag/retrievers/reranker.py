import logging
import re
from typing import List, Tuple
from ..schemas import RetrievalChunk
from ..exceptions import RerankingError

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


class CrossEncoderReranker:
    """Reranks candidate chunks by combining semantic relevance score, substantive query term match, and filename relevance."""

    def __init__(self, model: str = "cross-encoder/default", min_score_threshold: float = 0.25):
        self.model = model
        self.min_score_threshold = min_score_threshold

    def rerank(self, query: str, candidates: List[RetrievalChunk], top_k: int = 6) -> List[Tuple[RetrievalChunk, float]]:
        try:
            query_lower = query.lower()
            expanded_query = query_lower
            if re.search(r'7\s*/\s*12|7-12|satbara|sat\s*bara', query_lower):
                expanded_query += " 712 7/12 satbara सातबारा गाव_नमुना"

            # 1. Extract substantive subject tokens (excluding instructional & educational meta-words)
            raw_tokens = re.findall(r'\b[\w/]+\b', expanded_query)
            grade_tokens = {'1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'}
            query_tokens = [t for t in raw_tokens if t not in INSTRUCTIONAL_STOPWORDS and t not in grade_tokens and (len(t) > 2 or t.isdigit())]

            # Core subject matter tokens (pure domain keywords like 'reproduction', 'photosynthesis', 'satbara')
            subject_tokens = [t for t in query_tokens if not t.isdigit()]

            scored = []
            for c in candidates:
                base = float(c.score or 0.0)

                content_lower = (c.page_content or '').lower()
                title_lower = str(c.metadata.get('filename', '') or c.metadata.get('title', '')).lower()

                # Title / Filename matches (highest precision)
                title_matches = sum(1 for t in query_tokens if t in title_lower)
                title_ratio = min(title_matches / max(len(query_tokens), 1), 1.0)

                # Content keyword matches
                content_matches = sum(1 for t in query_tokens if t in content_lower)
                content_ratio = min(content_matches / max(len(query_tokens), 1), 1.0)

                # If the query contains substantive subject tokens and filename doesn't match:
                # filter out completely irrelevant chunks that don't match query concepts
                if subject_tokens and title_matches == 0:
                    full_subject_phrase = ' '.join(subject_tokens)
                    has_full_phrase = (full_subject_phrase in content_lower) or (full_subject_phrase in title_lower)
                    matched_subject = [st for st in subject_tokens if st in content_lower or st in title_lower]
                    subject_match_ratio = len(matched_subject) / len(subject_tokens)

                    # For multi-word subject topics:
                    # Drop chunks unless they match full phrase, >= 40% of terms, or have strong base score (>= 0.60).
                    if len(subject_tokens) >= 2:
                        if not has_full_phrase and subject_match_ratio < 0.40 and base < 0.60:
                            continue
                    else:
                        if subject_match_ratio == 0 and base < 0.50:
                            continue

                # Numbers / Identifiers match check (e.g. 142, 712, 140) excluding generic grade numbers
                digit_tokens = [t for t in query_tokens if any(ch.isdigit() for ch in t) and t not in grade_tokens]
                digit_boost = 0.0
                if digit_tokens:
                    digit_matches = sum(1 for d in digit_tokens if d in content_lower or d in title_lower)
                    digit_boost = 0.20 * (digit_matches / len(digit_tokens))

                # Combined score: 40% base retrieval + 40% content overlap + 20% title/filename match + digit boost
                score = round(0.40 * base + 0.40 * content_ratio + 0.20 * title_ratio + digit_boost, 4)

                if score >= self.min_score_threshold:
                    scored.append((c, score))

            scored.sort(key=lambda x: x[1], reverse=True)
            return scored[:top_k]
        except Exception as e:
            logger.exception('Reranking failed')
            raise RerankingError(str(e))
