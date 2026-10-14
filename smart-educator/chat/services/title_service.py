import re
import os
import logging
import requests

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent / '.env')

logger = logging.getLogger(__name__)


class TitleService:
    @staticmethod
    def generate_title(text: str) -> str:
        cleaned = re.sub(r'\s+', ' ', text).strip()
        if not cleaned:
            return 'New Chat'

        # 1. Try fast LLM title generation (Groq)
        groq_key = os.environ.get('GROQ_API_KEY')
        if groq_key:
            try:
                resp = requests.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    headers={'Authorization': f'Bearer {groq_key}', 'Content-Type': 'application/json'},
                    json={
                        'model': 'qwen/qwen3.8-27b',
                        'messages': [
                            {'role': 'user', 'content': f'Generate a concise 2 to 4 word topic title for this user query. Output ONLY the title text with no quotes, punctuation, or preamble:\n\n{cleaned}'}
                        ],
                        'temperature': 0.2,
                        'max_tokens': 30
                    },
                    timeout=5
                )
                if resp.status_code == 200:
                    raw_title = resp.json()['choices'][0]['message']['content'].strip(' "\'.')
                    # Strip any "Title: " prefix
                    raw_title = re.sub(r'^(title:|\*\*title:\*\*)\s*', '', raw_title, flags=re.IGNORECASE).strip()
                    words = raw_title.split()
                    if 1 <= len(words) <= 7:
                        return ' '.join(words).title()
            except Exception as e:
                logger.debug('LLM title generation failed, falling back to heuristic: %s', e)

        # 2. Smart Natural Language Heuristic (ChatGPT-style topic extraction)
        # Strip conversational question preambles
        pattern = r'^(please\s+)?(can\s+you\s+)?(explain|tell\s+me\s+about|what\s+is|what\s+are|how\s+to|how\s+does|how\s+do|describe|help\s+me\s+with|write\s+a|give\s+me|show\s+me|discuss|define)\s+(the\s+|a\s+|an\s+)?'
        topic = re.sub(pattern, '', cleaned, flags=re.IGNORECASE).strip()
        
        # Remove trailing question mark or punctuation
        topic = re.sub(r'[?!.,;:]+$', '', topic).strip()

        words = topic.split()
        if not words:
            words = cleaned.split()

        # Keep first 3-5 words
        title_words = words[:4]
        smart_title = ' '.join(title_words).title()

        return smart_title if smart_title else 'New Chat'
