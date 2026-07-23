import logging
from typing import List
from ..services.retrieval_service import RetrievalService
from ..prompts.exam_prompt import build_exam_prompt
from ..services.generation_service import GenerationService
from ..citation.citation_service import build_citations
from ..validators.answer_validator import AnswerValidator
from ..exceptions import RetrievalError

logger = logging.getLogger(__name__)


class ExamPipeline:
    def __init__(self, retrieval: RetrievalService = None, generator: GenerationService = None):
        self.retrieval = retrieval or RetrievalService()
        self.generator = generator or GenerationService()

    def run(self, user, query: str, chat_history: List[dict] = None) -> dict:
        logger.info('Exam pipeline started')
        try:
            retrieval_result = self.retrieval.retrieve(user=user, raw_query=query, chat_history=chat_history)
        except RetrievalError:
            # If retrieval failed likely due to low confidence
            return {'status': 'INSUFFICIENT_CONTEXT', 'answer': "I couldn't find enough information in your uploaded study material.", 'citations': []}

        # Build prompt from reranked chunks only
        prompt = build_exam_prompt(question=query, chunks=retrieval_result.reranked_chunks)
        logger.info('Prompt built for exam mode')

        text, raw = self.generator.generate(prompt)
        logger.info('Gemini response received')

        citations = build_citations(retrieval_result.reranked_chunks)
        validation = AnswerValidator.validate(text, citations)
        if not validation.get('valid'):
            return {'status': 'VALIDATION_FAILED', 'reason': validation.get('reason'), 'answer': None, 'citations': citations}

        return {'status': 'OK', 'answer': text, 'citations': citations}
