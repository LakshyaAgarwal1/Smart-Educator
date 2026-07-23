import sqlite3
import json
import threading
from typing import Optional, List


class EmbeddingCache:
    def __init__(self, db_path: str = "./embedding_cache.sqlite3"):
        self._db_path = db_path
        self._lock = threading.Lock()
        self._ensure_db()

    def _ensure_db(self):
        conn = sqlite3.connect(self._db_path)
        try:
            conn.execute("""CREATE TABLE IF NOT EXISTS embeddings(
                key TEXT PRIMARY KEY,
                vector TEXT
            )""")
            conn.commit()
        finally:
            conn.close()

    def get(self, key: str) -> Optional[List[float]]:
        conn = sqlite3.connect(self._db_path)
        try:
            row = conn.execute("SELECT vector FROM embeddings WHERE key = ?", (key,)).fetchone()
            if not row:
                return None
            return json.loads(row[0])
        finally:
            conn.close()

    def set(self, key: str, vector: List[float]):
        conn = sqlite3.connect(self._db_path)
        try:
            conn.execute("REPLACE INTO embeddings(key, vector) VALUES(?,?)", (key, json.dumps(vector)))
            conn.commit()
        finally:
            conn.close()
