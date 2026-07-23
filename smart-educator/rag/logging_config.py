import logging
import uuid
from pythonjsonlogger import jsonlogger


def configure_logging(level=logging.INFO):
    logger = logging.getLogger()
    handler = logging.StreamHandler()
    fmt = jsonlogger.JsonFormatter('%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s %(user_id)s %(session_id)s')
    handler.setFormatter(fmt)
    logger.addHandler(handler)
    logger.setLevel(level)


def new_request_context(user_id: str = None, session_id: str = None) -> dict:
    return {
        'request_id': str(uuid.uuid4()),
        'user_id': str(user_id) if user_id is not None else None,
        'session_id': str(session_id) if session_id is not None else None,
    }
