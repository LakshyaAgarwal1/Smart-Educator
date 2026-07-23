import sqlite3
import threading
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from ..config import MAX_CONTEXT_TOKENS


class ConversationMemory:
    def __init__(self, db_path: str = './conversation_memory.sqlite3'):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._ensure_db()

    def _ensure_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''CREATE TABLE IF NOT EXISTS memory(
                session_id TEXT,
                role TEXT,
                content TEXT,
                retrieved_context TEXT,
                ts TEXT
            )''')

    def append(self, session_id: str, role: str, content: str, retrieved_context: Optional[str] = None):
        with self._lock, sqlite3.connect(self.db_path) as conn:
            conn.execute('INSERT INTO memory(session_id, role, content, retrieved_context, ts) VALUES(?,?,?,?,?)',
                         (session_id, role, content, retrieved_context or '', datetime.utcnow().isoformat()))
            conn.commit()

    def get_recent(self, session_id: str, window_minutes: int = 30) -> List[Dict[str, Any]]:
        cutoff = (datetime.utcnow() - timedelta(minutes=window_minutes)).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute('SELECT role, content, retrieved_context, ts FROM memory WHERE session_id = ? AND ts >= ? ORDER BY ts DESC',
                                (session_id, cutoff)).fetchall()
        return [{'role': r[0], 'content': r[1], 'retrieved_context': r[2], 'ts': r[3]} for r in rows]

    def clear(self, session_id: str):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('DELETE FROM memory WHERE session_id = ?', (session_id,))
            conn.commit()
