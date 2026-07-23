import os
import logging
from typing import List, Dict, Any
import requests
from ..config import WEB_TIMEOUT, MAX_WEB_RESULTS

logger = logging.getLogger(__name__)


class WebSearchService:
    def __init__(self, api_url: str = None, api_key: str = None, timeout: int = WEB_TIMEOUT):
        self.api_url = api_url or os.environ.get('WEB_SEARCH_API_URL')
        self.api_key = api_key or os.environ.get('WEB_SEARCH_API_KEY')
        self.timeout = timeout

    def search(self, query: str, max_results: int = MAX_WEB_RESULTS) -> List[Dict[str, Any]]:
        if not self.api_url:
            logger.warning('WebSearchService: no API configured')
            return []
        try:
            resp = requests.get(self.api_url, params={'q': query, 'num': max_results}, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            # expected format: list of {title, snippet, url}
            return data.get('results', []) if isinstance(data, dict) else []
        except Exception as e:
            logger.exception('Web search failed')
            return []
