import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class QueryRewriter:
    """Rewrite conversational follow-ups into standalone questions.

    Simple implementation: if chat_history exists, prepend the last user message's subject.
    More advanced LLM-based rewriting can be plugged in later.
    """

    @staticmethod
    def rewrite(user_query: str, chat_history: Optional[List[Dict[str, str]]] = None) -> str:
        if not chat_history:
            return user_query

        # Find last user message in history
        last_user = None
        for msg in reversed(chat_history):
            if msg.get('role') == 'user' and msg.get('content'):
                last_user = msg.get('content')
                break

        if not last_user:
            return user_query

        # If the query is short and likely a follow-up, combine
        if len(user_query.split()) <= 6:
            rewritten = f"{user_query.strip().rstrip('?')} about {last_user.strip()}"
            logger.info("Rewrote query '%s' -> '%s'", user_query, rewritten)
            return rewritten

        return user_query
