import os

import requests

from ..utils.retry import retry_on_error
from ..utils.validators import ensure_env
from .exceptions import GeminiError


class GeminiClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or ensure_env('GEMINI_API_KEY')
        self.base_url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

    def generate(self, prompt, temperature=0.5):
        payload = {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'temperature': temperature},
        }
        url = f'{self.base_url}?key={self.api_key}'
        response = retry_on_error(lambda: requests.post(url, json=payload, timeout=20), retries=2)
        if response.status_code != 200:
            raise GeminiError(f'Gemini request failed: {response.text}')
        data = response.json()
        try:
            return data['candidates'][0]['content']['parts'][0]['text']
        except (KeyError, IndexError):
            raise GeminiError('Unexpected Gemini response format.')
