import re
import logging
from typing import List

logger = logging.getLogger(__name__)


class TextProcessor:
    @staticmethod
    def clean_text(text: str) -> str:
        if not text:
            return ""
        # normalize whitespace, remove control chars
        txt = re.sub(r"\s+", " ", text)
        txt = re.sub(r"[\x00-\x1f\x7f]+", "", txt)
        return txt.strip()
