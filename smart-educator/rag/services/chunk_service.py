import logging
from typing import List
from datetime import datetime

from ..schemas import Chunk, ChunkMetadata
from ..chunkers.text_chunker import chunk_document

logger = logging.getLogger(__name__)


class ChunkService:
    def __init__(self, min_chunk_size: int = 100, max_chunk_size: int = 1500, chunk_overlap: int = 150):
        self.min_chunk_size = min_chunk_size
        self.max_chunk_size = max_chunk_size
        self.chunk_overlap = chunk_overlap

    def create_chunks(self, raw_pages: List[dict], metadata_base: dict) -> List[Chunk]:
        chunks: List[Chunk] = []
        idx = 0
        for page in raw_pages:
            text = page.get('text', '')
            if not text or not text.strip():
                continue
            semantic_chunks = chunk_document(text, min_chunk_size=self.min_chunk_size, max_chunk_size=self.max_chunk_size, chunk_overlap=self.chunk_overlap)
            for ci, ch in enumerate(semantic_chunks):
                md = ChunkMetadata(
                    user_id=str(metadata_base['user_id']),
                    document_id=str(metadata_base['document_id']),
                    filename=metadata_base.get('filename', ''),
                    page_number=page.get('page', 1),
                    chunk_index=idx,
                    source=metadata_base.get('source', 'UPLOAD'),
                    upload_timestamp=metadata_base.get('upload_timestamp', datetime.utcnow()),
                    document_hash=metadata_base.get('document_hash', ''),
                    document_type=metadata_base.get('document_type', 'unknown'),
                    google_drive_file_id=metadata_base.get('google_drive_file_id'),
                )
                chunks.append(Chunk(text=ch, metadata=md))
                idx += 1
        return chunks
