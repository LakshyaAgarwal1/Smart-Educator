import logging
from typing import Tuple, List
from ..services.loader_service import LoaderService
from ..exceptions import ExtractionError

logger = logging.getLogger(__name__)


class ExtractionService:
    """Extract text from a file path using the project's loaders.

    Returns a tuple (pages, is_ocr_needed)
    where pages is a list of dicts {'page': int, 'text': str}
    """

    @staticmethod
    def extract(path: str) -> Tuple[List[dict], bool]:
        try:
            pages = LoaderService.load(path)
            usable = any(p.get('text', '').strip() for p in pages)
            # Only trigger OCR fallback for PDF or image files
            ext = (path or '').lower().rsplit('.', 1)[-1] if '.' in (path or '') else ''
            if ext in ('pdf', 'png', 'jpg', 'jpeg'):
                return pages, not usable
            return pages, False
        except Exception as e:
            logger.exception("Extraction failed")
            raise ExtractionError(str(e))
