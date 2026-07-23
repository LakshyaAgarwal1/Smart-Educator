from .base_loader import BaseLoader
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class PDFLoader(BaseLoader):
    def load(self) -> List[Dict]:
        try:
            from pypdf import PdfReader
        except Exception:
            logger.exception('pypdf not installed')
            return []

        pages = []
        try:
            reader = PdfReader(self.path)
            for i, p in enumerate(reader.pages, start=1):
                try:
                    text = p.extract_text() or ''
                except Exception:
                    text = ''
                pages.append({'page': i, 'text': text})
        except Exception:
            logger.exception('Failed to read PDF')

        return pages
