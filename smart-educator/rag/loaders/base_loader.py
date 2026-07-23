from typing import List, Dict


class BaseLoader:
    """Abstract loader interface."""

    def __init__(self, path: str):
        self.path = path

    def load(self) -> List[Dict]:
        """Return a list of page dicts: {'page': int, 'text': str}.

        Implementations must handle file opening and decoding.
        """
        raise NotImplementedError()
