class RAGError(Exception):
    """Base exception for RAG module."""


class DuplicateDocumentError(RAGError):
    """Raised when a document already exists and should be reused."""


class ExtractionError(RAGError):
    """Raised when text extraction fails."""


class EmbeddingError(RAGError):
    """Raised for embedding generation failures."""


class VectorStoreError(RAGError):
    """Raised for vectorstore-related failures."""


class RetrievalError(RAGError):
    """Raised for retrieval pipeline failures."""


class RerankingError(RAGError):
    """Raised when reranking fails."""


class ConfidenceValidationError(RAGError):
    """Raised when confidence validation fails."""
