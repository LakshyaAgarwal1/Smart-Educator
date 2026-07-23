import logging
from typing import List
from ..exceptions import ExtractionError

logger = logging.getLogger(__name__)


class OCRService:
    @staticmethod
    def ocr_from_path(path: str) -> List[dict]:
        try:
            import pytesseract
            from pdf2image import convert_from_path
        except Exception as e:
            logger.error("OCR dependencies missing: %s", e)
            raise ExtractionError("OCR dependencies not available")

        try:
            images = convert_from_path(path)
            pages = []
            for idx, img in enumerate(images, start=1):
                text = pytesseract.image_to_string(img)
                pages.append({'page': idx, 'text': text})
            return pages
        except Exception as e:
            logger.exception("OCR failed")
            raise ExtractionError(str(e))
