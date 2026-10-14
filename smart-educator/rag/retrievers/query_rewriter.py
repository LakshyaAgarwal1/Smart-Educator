import logging
import re
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class QueryRewriter:
    """Rewrite conversational follow-ups into standalone questions and expand key domain aliases."""

    @staticmethod
    def rewrite(user_query: str, chat_history: Optional[List[Dict[str, str]]] = None) -> str:
        q = user_query.strip()

        # 1. Resolve conversational follow-ups using chat history
        if chat_history:
            last_user = None
            for msg in reversed(chat_history):
                if msg.get('role') == 'user' and msg.get('content'):
                    last_user = msg.get('content')
                    break

            if last_user and len(q.split()) <= 6:
                # Avoid doubling if last_user already contained the subject
                clean_last = last_user.strip().rstrip('?.!')
                q = f"{q.rstrip('?.!')} in the context of {clean_last}"
                logger.info("Rewrote query '%s' -> '%s'", user_query, q)

        # 2. Expand land record domain terms (7/12 <-> 712 <-> satbara)
        if re.search(r'\b(7/12|7-12|712|satbara|sat\s*bara)\b', q, re.IGNORECASE):
            q_expanded = f"{q} (712 7/12 satbara सातबारा गाव नमुना ७ गाव नमुना १२)"
            return q_expanded

        return q
