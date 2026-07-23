from typing import Literal
from ..core.exam_pipeline import ExamPipeline
from ..core.web_pipeline import WebPipeline


def route(mode: Literal['EXAM', 'WEB']):
    m = mode.upper()
    if m == 'EXAM':
        return ExamPipeline()
    elif m == 'WEB':
        return WebPipeline()
    else:
        raise ValueError('Unknown mode')
