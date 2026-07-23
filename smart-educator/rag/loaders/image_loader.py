from .base_loader import BaseLoader
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class ImageLoader(BaseLoader):
    def load(self) -> List[Dict]:
        try:
            from PIL import Image
            import pytesseract
        except Exception:
            logger.exception('Pillow or pytesseract not available for image OCR')
            return []

        try:
            img = Image.open(self.path)
            text = pytesseract.image_to_string(img)
            return [{'page': 1, 'text': text}]
        except Exception:
            logger.exception('Failed to OCR image')
            return []
