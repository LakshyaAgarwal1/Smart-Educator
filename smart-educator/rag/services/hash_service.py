import hashlib
from pathlib import Path
from typing import Union


class HashService:
    @staticmethod
    def compute_sha256_from_path(path: Union[str, Path]) -> str:
        sha256 = hashlib.sha256()
        p = Path(path)
        with p.open('rb') as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
