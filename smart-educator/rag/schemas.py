from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, List, Any
from datetime import datetime


@dataclass
class ChunkMetadata:
    user_id: str
    document_id: str
    filename: str
    page_number: int
    chunk_index: int
    source: str
    upload_timestamp: datetime
    document_hash: str
    document_type: str
    google_drive_file_id: Optional[str] = None


@dataclass
class Chunk:
    text: str
    metadata: ChunkMetadata
    embedding: Optional[List[float]] = None


@dataclass
class Embedding:
    id: str
    vector: List[float]
    metadata: ChunkMetadata


@dataclass
class IndexingResult:
    document_id: str
    is_duplicate: bool
    chunks_indexed: int
    message: Optional[str] = None


@dataclass
class RetrievalChunk:
    page_content: str
    metadata: ChunkMetadata
    vector_id: Optional[str] = None
    score: Optional[float] = None


@dataclass
class RetrievalResult:
    rewritten_query: str
    retrieved_chunks: List[RetrievalChunk]
    reranked_chunks: List[RetrievalChunk]
    retrieval_scores: List[float]
    confidence_score: float
    retrieval_time: float
    metadata: dict
    retrieval_status: str
