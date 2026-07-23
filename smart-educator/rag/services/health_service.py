import logging
import shutil
from typing import Dict
from ..vectorstore.chroma_wrapper import ChromaWrapper
from .generation_service import GenerationService
from .embedding_cache import EmbeddingCache

logger = logging.getLogger(__name__)


class HealthService:
    def __init__(self, chroma: ChromaWrapper = None, gen: GenerationService = None, cache: EmbeddingCache = None):
        self.chroma = chroma or ChromaWrapper()
        self.gen = gen or GenerationService()
        self.cache = cache or EmbeddingCache()

    def check(self) -> Dict[str, str]:
        status = {}
        # Chroma health
        status['chroma'] = 'ok' if self.chroma.health_check() else 'fail'

        # Gemini quick health via presence of api_url/key
        try:
            status['gemini'] = 'ok' if self.gen.api_key and self.gen.api_url else 'unknown'
        except Exception:
            status['gemini'] = 'fail'

        # OCR
        try:
            import pytesseract  # type: ignore
            status['ocr'] = 'ok'
        except Exception:
            status['ocr'] = 'missing'

        # Disk
        total, used, free = shutil.disk_usage('.')
        status['disk_free_bytes'] = str(free)

        # Embedding cache
        try:
            test = self.cache.get('health_test')
            status['cache'] = 'ok'
        except Exception:
            status['cache'] = 'fail'

        return status
