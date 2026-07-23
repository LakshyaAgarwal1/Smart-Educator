from typing import List, Tuple
from ..loaders.loader_factory import LoaderFactory


class LoaderService:
    """Wraps file loaders and returns page-level text entries.

    Each returned entry is a dict with keys: 'text' and 'page'
    """

    @staticmethod
    def load(path: str) -> List[dict]:
        loader = LoaderFactory.create_loader(path)
        return loader.load()
