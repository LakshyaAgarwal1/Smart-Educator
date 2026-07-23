import random
import time
from typing import Callable, TypeVar

T = TypeVar('T')


def retry_on_error(func: Callable[[], T], retries: int = 3, delay: float = 0.5):
    last_error = None
    for attempt in range(retries):
        try:
            return func()
        except Exception as exc:  # pragma: no cover - simple wrapper
            last_error = exc
            if attempt == retries - 1:
                raise
            time.sleep(delay * (attempt + 1) + random.uniform(0, 0.1))
    raise last_error
