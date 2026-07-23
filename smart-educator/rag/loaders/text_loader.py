from .base_loader import BaseLoader
from typing import List, Dict


class TextLoader(BaseLoader):
    def load(self) -> List[Dict]:
        with open(self.path, 'rb') as f:
            data = f.read()
        try:
            text = data.decode('utf-8')
        except Exception:
            text = data.decode('latin-1', errors='ignore')
        return [{'page': 1, 'text': text}]
