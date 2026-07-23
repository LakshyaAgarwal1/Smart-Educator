import os
import logging
import time
from typing import Tuple, Optional
import requests
from requests.adapters import HTTPAdapter, Retry
from ..config import TEMPERATURE, MAX_OUTPUT_TOKENS

logger = logging.getLogger(__name__)


class GenerationService:
    def __init__(self, api_key: Optional[str] = None, api_url: Optional[str] = None, timeout: int = 30):
        self.api_key = api_key or os.environ.get('GEMINI_API_KEY')
        self.api_url = api_url or os.environ.get('GEMINI_API_URL')
        self.timeout = timeout
        self.session = requests.Session()
        retries = Retry(total=2, backoff_factor=0.5, status_forcelist=[502, 503, 504])
        self.session.mount('https://', HTTPAdapter(max_retries=retries))
        if not self.api_key or not self.api_url:
            logger.warning('GenerationService: GEMINI_API_KEY or GEMINI_API_URL not configured')

    def generate(self, prompt: str, temperature: float = TEMPERATURE, max_tokens: int = MAX_OUTPUT_TOKENS, timeout: Optional[int] = None) -> Tuple[str, dict]:
        """Synchronous generation call. Returns (text, raw_response)."""
        timeout = timeout or self.timeout
        headers = {'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'}
        payload = {
            'model': 'gemini-1.0',
            'prompt': prompt,
            'temperature': temperature,
            'max_output_tokens': max_tokens,
        }
        start = time.time()
        try:
            resp = self.session.post(self.api_url, json=payload, headers=headers, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()
            # Expect 'text' field - adapt to actual Gemini response shape
            text = data.get('text') or data.get('output') or ''
            logger.info('Gemini generation succeeded in %.2fs', time.time() - start)
            return text, data
        except Exception as e:
            logger.exception('Generation failed')
            raise

    def generate_stream(self, prompt: str, temperature: float = TEMPERATURE, max_tokens: int = MAX_OUTPUT_TOKENS, timeout: Optional[int] = None):
        """Streamed generation. Yields token strings as they arrive.

        This expects the upstream Gemini API to support streaming (SSE or chunked JSON lines).
        The generator yields (token:str, meta:dict) tuples.
        """
        timeout = timeout or self.timeout
        headers = {'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'}
        payload = {
            'model': 'gemini-1.0',
            'prompt': prompt,
            'temperature': temperature,
            'max_output_tokens': max_tokens,
            'stream': True,
        }
        try:
            with self.session.post(self.api_url, json=payload, headers=headers, timeout=timeout, stream=True) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines(decode_unicode=True):
                    if not line:
                        continue
                    try:
                        # attempt to decode JSON chunk
                        import json
                        payload = json.loads(line)
                        token = payload.get('token') or payload.get('text') or ''
                        yield token, payload
                    except Exception:
                        # fallback: yield raw line
                        yield line, {}
        except Exception as e:
            logger.exception('Streaming generation failed')
            raise
