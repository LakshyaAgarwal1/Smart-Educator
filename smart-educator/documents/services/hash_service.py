import hashlib
from pathlib import Path


class HashService:
    @staticmethod
    def compute_sha256(file_path):
        sha256 = hashlib.sha256()
        with Path(file_path).open('rb') as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
