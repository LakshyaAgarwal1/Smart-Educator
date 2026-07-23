from typing import Any
from ..core.mode_router import route


class PipelineService:
    def __init__(self):
        pass

    def run(self, mode: str, user: Any, query: str, chat_history: list | None = None):
        pipeline = route(mode)
        return pipeline.run(user=user, query=query, chat_history=chat_history)
