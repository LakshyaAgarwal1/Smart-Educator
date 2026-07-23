from typing import Any
from .pipeline_service import PipelineService


class QueryService:
    def __init__(self):
        self.pipeline = PipelineService()

    def answer(self, mode: str, user: Any, query: str, chat_history: list | None = None):
        return self.pipeline.run(mode=mode, user=user, query=query, chat_history=chat_history)
