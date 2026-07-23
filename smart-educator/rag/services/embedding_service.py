import os
import logging
from typing import List, Dict
from ..schemas import Embedding, Chunk
from .embedding_cache import EmbeddingCache
from ..exceptions import EmbeddingError
import requests

logger = logging.getLogger(__name__)


class GeminiEmbeddingService:
    def __init__(self, api_key: str = None, cache: EmbeddingCache = None):
        self.api_key = api_key or os.environ.get('GEMINI_API_KEY')
        self.cache = cache or EmbeddingCache()
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set; embedding calls will fail at runtime")

    def _cache_key(self, text: str) -> str:
        # simple key; production can use sha256
        return str(hash(text))

    def embed_batch(self, chunks: List[Chunk]) -> List[Embedding]:
        texts = [c.text for c in chunks]
        results: List[Embedding] = []

        # check cache
        to_request_idx = []
        for i, t in enumerate(texts):
            key = self._cache_key(t)
            vec = self.cache.get(key)
            if vec is not None:
                results.append(Embedding(id=str(i), vector=vec, metadata=chunks[i].metadata))
            else:
                results.append(None)
                to_request_idx.append(i)

        if to_request_idx:
            try:
                payload_texts = [texts[i] for i in to_request_idx]
                # Example Gemini embeddings call - adapt to real API
                url = os.environ.get('GEMINI_EMBEDDING_URL', 'https://api.generativeai.google/v1beta2/embeddings:embed')
                headers = {'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'}
                body = {"model": "gemini-embedding-1.0", "input": payload_texts}
                resp = requests.post(url, json=body, headers=headers, timeout=30)
                resp.raise_for_status()
                data = resp.json()
                vectors = [item['embedding'] for item in data.get('data', [])]
                for i, vec in zip(to_request_idx, vectors):
                    key = self._cache_key(texts[i])
                    self.cache.set(key, vec)
                    results[i] = Embedding(id=str(i), vector=vec, metadata=chunks[i].metadata)
            except Exception as e:
                logger.exception('Embedding batch failed')
                raise EmbeddingError(str(e))

        # filter None
        return [r for r in results if r is not None]
