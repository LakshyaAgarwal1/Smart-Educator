import logging
import re
from typing import List, Dict
from ..services.retrieval_service import RetrievalService
from ..prompts.web_prompt import build_web_prompt
from ..services.generation_service import GenerationService
from ..citation.citation_service import build_citations
from ..validators.answer_validator import AnswerValidator
from ..services.web_search_service import WebSearchService

logger = logging.getLogger(__name__)


def _is_greeting_or_conversational(query: str) -> bool:
    clean = re.sub(r'[^\w\s]', '', query.strip().lower())
    tokens = clean.split()
    if not tokens:
        return False
    greeting_tokens = {'hi', 'hello', 'hey', 'hiya', 'howdy', 'greetings', 'namaste', 'morning', 'afternoon', 'evening'}
    if tokens[0] in greeting_tokens and len(tokens) <= 4:
        return True
    meta_phrases = [
        'who are you', 'what are you', 'what can you do', 'how do you work',
        'help', 'help me', 'good morning', 'good afternoon', 'good evening',
        'thanks', 'thank you', 'how are you'
    ]
    if any(clean.startswith(p) for p in meta_phrases):
        return True
    return False


class WebPipeline:
    def __init__(self, retrieval: RetrievalService = None, web_search: WebSearchService = None, generator: GenerationService = None):
        self.retrieval = retrieval or RetrievalService()
        self.web_search = web_search or WebSearchService()
        self.generator = generator or GenerationService()

    def run(self, user, query: str, chat_history: List[dict] = None) -> dict:
        logger.info('Web pipeline started for user=%s query=%s', user.id, query)

        # 1. Handle conversational greetings immediately without RAG retrieval or fake citations
        if _is_greeting_or_conversational(query):
            greeting_prompt = (
                f"User greeted with: '{query}'. "
                f"Respond warmly, concisely, and professionally as SmartEducator AI in **Web Mode** (2-3 sentences max). "
                f"Explain that in Web Mode you can answer broad research, scientific, and academic topics by searching verified live sources (Wikipedia, arXiv) while referencing their uploaded notes. "
                f"Invite them to ask any question or topic."
            )
            ans, _ = self.generator.generate(greeting_prompt, max_tokens=250)
            return {
                'status': 'OK',
                'answer': ans,
                'citations': [],
                'confidence': 98
            }

        # 2. Retrieve internal chunks, filtering out low-relevance noise
        internal_chunks = []
        try:
            retrieval_result = self.retrieval.retrieve(user=user, raw_query=query, chat_history=chat_history)
            raw_chunks = retrieval_result.reranked_chunks if retrieval_result else []
            # Only keep verified reranked chunks that met the quality threshold
            internal_chunks = [c for c in raw_chunks if float(getattr(c, 'score', 0.0) or 0.0) >= 0.25]
        except Exception as e:
            logger.info("Internal retrieval in web mode returned no chunks: %s", e)

        # 3. Search web
        web_results = []
        try:
            web_results = self.web_search.search(query) or []
            logger.info('Web search returned %d results', len(web_results))
        except Exception as e:
            logger.warning('Web search failed: %s', e)

        # 4. Merge internal + web
        prompt = build_web_prompt(question=query, internal=internal_chunks, web_results=web_results)
        logger.info('Prompt built for web mode with %d internal chunks and %d web results', len(internal_chunks), len(web_results))

        text, raw = self.generator.generate(prompt, temperature=0.3)
        citations = build_citations(internal_chunks, web_results, answer_text=text)

        confidence_pct = 90 if (internal_chunks or web_results) else 60

        return {
            'status': 'OK',
            'answer': text,
            'citations': citations,
            'confidence': confidence_pct
        }
