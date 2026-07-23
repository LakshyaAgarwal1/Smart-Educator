import logging
from typing import List, Dict
from ..services.retrieval_service import RetrievalService
from ..prompts.web_prompt import build_web_prompt
from ..services.generation_service import GenerationService
from ..citation.citation_service import build_citations
from ..validators.answer_validator import AnswerValidator
from ..services.web_search_service import WebSearchService

logger = logging.getLogger(__name__)


class WebPipeline:
    def __init__(self, retrieval: RetrievalService = None, web_search: WebSearchService = None, generator: GenerationService = None):
        self.retrieval = retrieval or RetrievalService()
        self.web_search = web_search or WebSearchService()
        self.generator = generator or GenerationService()

    def run(self, user, query: str, chat_history: List[dict] = None) -> dict:
        logger.info('Web pipeline started')
        retrieval_result = self.retrieval.retrieve(user=user, raw_query=query, chat_history=chat_history)

        # Search web
        web_results = self.web_search.search(query)
        logger.info('Web search returned %d results', len(web_results))

        # Merge internal + web, internal priority handled in prompt
        prompt = build_web_prompt(question=query, internal=retrieval_result.reranked_chunks, web_results=web_results)
        logger.info('Prompt built for web mode')

        text, raw = self.generator.generate(prompt)
        citations = build_citations(retrieval_result.reranked_chunks, web_results)
        validation = AnswerValidator.validate(text, citations)
        if not validation.get('valid'):
            return {'status': 'VALIDATION_FAILED', 'reason': validation.get('reason'), 'answer': None, 'citations': citations}

        return {'status': 'OK', 'answer': text, 'citations': citations}
