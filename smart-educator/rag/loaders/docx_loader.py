from .base_loader import BaseLoader
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class DocxLoader(BaseLoader):
    def load(self) -> List[Dict]:
        try:
            from docx import Document as DocxDocument
        except Exception:
            logger.exception('python-docx not installed')
            return []

        try:
            doc = DocxDocument(self.path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            text = '\n'.join(paragraphs)
            return [{'page': 1, 'text': text}]
        except Exception:
            logger.exception('Failed to read docx')
            return []
