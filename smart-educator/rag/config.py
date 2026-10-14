"""Retrieval configuration parameters."""
from typing import Final

SEMANTIC_TOP_K: Final[int] = 50
BM25_TOP_K: Final[int] = 50
FINAL_TOP_K: Final[int] = 6
RERANKER_MODEL: Final[str] = "cross-encoder/default"
SIMILARITY_THRESHOLD: Final[float] = 0.15
CONFIDENCE_THRESHOLD: Final[float] = 0.5
BATCH_RERANK_SIZE: Final[int] = 64

# LLM / Generation settings
TEMPERATURE: Final[float] = 0.2
MAX_OUTPUT_TOKENS: Final[int] = 3000
MAX_CONTEXT_TOKENS: Final[int] = 8192
STREAMING_ENABLED: Final[bool] = False
WEB_TIMEOUT: Final[int] = 10
MAX_WEB_RESULTS: Final[int] = 10
