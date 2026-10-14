import logging
import re
from typing import List
from ..services.retrieval_service import RetrievalService
from ..prompts.exam_prompt import build_exam_prompt
from ..services.generation_service import GenerationService
from ..citation.citation_service import build_citations
from ..validators.answer_validator import AnswerValidator
from ..exceptions import RetrievalError

logger = logging.getLogger(__name__)


def _is_greeting_or_conversational(query: str) -> bool:
    clean = re.sub(r'[^\w\s]', '', query.strip().lower())
    tokens = clean.split()
    if not tokens:
        return False
    greeting_tokens = {'hi', 'hello', 'hey', 'hiya', 'howdy', 'greetings', 'namaste'}
    if tokens[0] in greeting_tokens and len(tokens) <= 3:
        return True
    meta_phrases = [
        'who are you', 'what are you', 'what can you do', 'how do you work',
        'help', 'help me', 'good morning', 'good afternoon', 'good evening'
    ]
    if any(clean.startswith(p) for p in meta_phrases):
        return True
    return False


class ExamPipeline:
    def __init__(self, retrieval: RetrievalService = None, generator: GenerationService = None):
        self.retrieval = retrieval or RetrievalService()
        self.generator = generator or GenerationService()

    def run(self, user, query: str, chat_history: List[dict] = None) -> dict:
        logger.info('Exam pipeline started for user=%s query=%s', user.id, query)

        # 1. Catch greetings and conversational interactions immediately
        if _is_greeting_or_conversational(query):
            greeting_prompt = (
                f"User greeted with: '{query}'. "
                f"Respond warmly and professionally as SmartEducator AI in **Exam Mode**. "
                f"Explain that in Exam Mode you synthesize comprehensive, high-yield answers directly from their uploaded study notes, syllabus, and connected Google Drive documents. "
                f"Invite them to ask any question from their study materials or request a concept summary."
            )
            ans, _ = self.generator.generate(greeting_prompt, max_tokens=300)
            return {
                'status': 'OK',
                'answer': ans,
                'citations': [],
                'confidence': 98
            }

        # 2. Retrieve relevant context chunks
        try:
            retrieval_result = self.retrieval.retrieve(user=user, raw_query=query, chat_history=chat_history)
        except Exception as e:
            logger.warning("Retrieval failed: %s", e)
            retrieval_result = None

        chunks = retrieval_result.reranked_chunks if (retrieval_result and hasattr(retrieval_result, 'reranked_chunks')) else []

        # If no chunks match, inform the user clearly
        if not chunks:
            return {
                'status': 'INSUFFICIENT_CONTEXT',
                'answer': "I couldn't find enough information in your uploaded study material for Exam Mode. You can upload relevant documents, or switch to **Web Mode** at the top right to search external sources.",
                'citations': [],
                'confidence': 25
            }

        # 3. Build prompt from reranked chunks
        prompt = build_exam_prompt(question=query, chunks=chunks)
        logger.info('Prompt built for exam mode with %d chunks', len(chunks))

        text, raw = self.generator.generate(prompt, temperature=0.15)

        # If LLM concludes context does not contain the answer, enforce zero hallucinations and zero citations
        if "couldn't find enough information" in text.lower() or "not enough information" in text.lower():
            return {
                'status': 'INSUFFICIENT_CONTEXT',
                'answer': "I couldn't find enough information in your uploaded study material.",
                'citations': [],
                'confidence': 20
            }

        citations = build_citations(chunks, answer_text=text)

        score = getattr(retrieval_result, 'confidence_score', 0.88)
        confidence_pct = min(98, max(50, int(float(score) * 100)))

        return {
            'status': 'OK',
            'answer': text,
            'citations': citations,
            'confidence': confidence_pct
        }
