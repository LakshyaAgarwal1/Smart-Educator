import os

import requests

from ..utils.validators import ensure_env
from .exceptions import SearchAPIError


class SearchClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('SEARCH_API_KEY')

    def search(self, query):
        if not self.api_key:
            raise SearchAPIError('No search API key configured.')
        response = requests.get(
            'https://serper.dev/search',
            params={'q': query, 'api_key': self.api_key},
            timeout=20,
        )
        if response.status_code != 200:
            raise SearchAPIError(f'Search request failed: {response.text}')
        return response.json().get('organic', [])
