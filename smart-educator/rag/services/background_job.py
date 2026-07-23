import threading
import queue
import time
import logging
from typing import Callable, Any, Dict

logger = logging.getLogger(__name__)


class BackgroundJobManager:
    def __init__(self, worker_count: int = 2):
        self._q: queue.Queue = queue.Queue()
        self._workers = []
        self._stop = threading.Event()
        for _ in range(worker_count):
            t = threading.Thread(target=self._worker_loop, daemon=True)
            t.start()
            self._workers.append(t)

    def enqueue(self, func: Callable[..., Any], *args, **kwargs) -> None:
        self._q.put((func, args, kwargs))

    def _worker_loop(self):
        while not self._stop.is_set():
            try:
                func, args, kwargs = self._q.get(timeout=1)
            except Exception:
                continue
            try:
                logger.info('Background job started: %s', getattr(func, '__name__', str(func)))
                func(*args, **kwargs)
                logger.info('Background job finished: %s', getattr(func, '__name__', str(func)))
            except Exception:
                logger.exception('Background job failed')
            finally:
                self._q.task_done()

    def stop(self):
        self._stop.set()
        for w in self._workers:
            w.join(timeout=1)
