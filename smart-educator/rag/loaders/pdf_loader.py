from .base_loader import BaseLoader
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class PDFLoader(BaseLoader):
    def load(self) -> List[Dict]:
        # Fast C-level extraction via PyMuPDF (fitz)
        try:
            import fitz
            doc = fitz.open(self.path)
            pages = []
            for i, page in enumerate(doc, start=1):
                pages.append({'page': i, 'text': page.get_text() or ''})
            doc.close()
            return pages
        except Exception:
            pass

        # Fallback to pypdf
        try:
            from pypdf import PdfReader
            reader = PdfReader(self.path)
            pages = []
            for i, p in enumerate(reader.pages, start=1):
                try:
                    text = p.extract_text() or ''
                except Exception:
                    text = ''
                pages.append({'page': i, 'text': text})
            return pages
        except Exception:
            logger.exception('Failed to read PDF')
            return []
