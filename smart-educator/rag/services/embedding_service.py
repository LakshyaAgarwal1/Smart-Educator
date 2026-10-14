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

        if to_request_idx and self.api_key:
            from concurrent.futures import ThreadPoolExecutor

            batch_size = 50
            sub_batches = [to_request_idx[j:j + batch_size] for j in range(0, len(to_request_idx), batch_size)]

            def _process_sub_batch(sub_indices):
                try:
                    payload_texts = [texts[idx] for idx in sub_indices]
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key={self.api_key}"
                    body = {
                        "requests": [
                            {
                                "model": "models/gemini-embedding-001",
                                "content": {"parts": [{"text": t}]}
                            }
                            for t in payload_texts
                        ]
                    }
                    resp = requests.post(url, json=body, timeout=25)
                    if resp.status_code == 200:
                        data = resp.json()
                        embeddings_data = data.get('embeddings', [])
                        for idx, item in zip(sub_indices, embeddings_data):
                            vec = item.get('values', [])
                            if vec:
                                key = self._cache_key(texts[idx])
                                self.cache.set(key, vec)
                                results[idx] = Embedding(id=str(idx), vector=vec, metadata=chunks[idx].metadata)
                    else:
                        logger.warning("Gemini embedding endpoint returned %d: %s", resp.status_code, resp.text[:200])
                except Exception as e:
                    logger.warning('Embedding sub-batch failed: %s', e)

            max_threads = min(len(sub_batches), 4)
            if max_threads > 1:
                with ThreadPoolExecutor(max_workers=max_threads) as executor:
                    list(executor.map(_process_sub_batch, sub_batches))
            else:
                for sb in sub_batches:
                    _process_sub_batch(sb)

        # Return whatever was embedded/cached
        return [r for r in results if r is not None]

