import sqlite3
import threading
import time
from typing import Optional


class MetricsService:
    def __init__(self, db_path: str = './rag_metrics.sqlite3'):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._ensure_db()

    def _ensure_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''CREATE TABLE IF NOT EXISTS metrics(
                name TEXT,
                value REAL,
                ts REAL
            )''')

    def record(self, name: str, value: float):
        with self._lock, sqlite3.connect(self.db_path) as conn:
            conn.execute('INSERT INTO metrics(name, value, ts) VALUES(?,?,?)', (name, value, time.time()))
            conn.commit()

    def query_recent(self, name: str, since_seconds: Optional[int] = 3600):
        cutoff = time.time() - (since_seconds or 3600)
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute('SELECT value, ts FROM metrics WHERE name = ? AND ts >= ? ORDER BY ts DESC', (name, cutoff)).fetchall()
        return rows
