import sqlite3
import json
import threading
import time
from typing import Optional, Any, Dict, List


class CacheManager:
    def __init__(self, db_path: str = './rag_cache.sqlite3'):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._ensure_db()

    def _ensure_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''CREATE TABLE IF NOT EXISTS cache(
                key TEXT PRIMARY KEY,
                value TEXT,
                ts REAL
            )''')

    def get(self, key: str) -> Optional[Any]:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute('SELECT value, ts FROM cache WHERE key = ?', (key,)).fetchone()
            if not row:
                return None
            return json.loads(row[0])

    def set(self, key: str, value: Any):
        with self._lock, sqlite3.connect(self.db_path) as conn:
            conn.execute('REPLACE INTO cache(key, value, ts) VALUES(?,?,?)', (key, json.dumps(value), time.time()))
            conn.commit()

    def invalidate(self, key_prefix: str):
        with self._lock, sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM cache WHERE key LIKE ?', (f'{key_prefix}%',))
            conn.commit()
