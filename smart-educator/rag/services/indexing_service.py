import logging
from typing import List, Optional
from datetime import datetime

from ..schemas import Chunk, IndexingResult
from ..exceptions import DuplicateDocumentError, ExtractionError
from .hash_service import HashService
from .extraction_service import ExtractionService
from .ocr_service import OCRService
from .text_processor import TextProcessor
from .chunk_service import ChunkService
from .embedding_service import GeminiEmbeddingService
from ..vectorstore.chroma_wrapper import ChromaWrapper
from documents.models import Document, DocumentChunk

logger = logging.getLogger(__name__)


class IndexingService:
    """Central orchestrator for the RAG indexing pipeline.

    Responsibilities:
    - Duplicate detection via SHA256
    - Extraction with OCR fallback
    - Cleaning, chunking, metadata creation
    - Batch embedding via Gemini with cache
    - Persist chunks to DB and vectors to Chroma
    """

    def __init__(self, collection_name: str = "rag_documents"):
        self.hash_service = HashService()
        self.extraction = ExtractionService()
        self.ocr = OCRService()
        self.text_processor = TextProcessor()
        self.chunk_service = ChunkService()
        self.embedding_service = GeminiEmbeddingService()
        self.store = ChromaWrapper(collection_name=collection_name)

    def index(self, user, file_path: str, filename: str, source: str = "UPLOAD", google_drive_file_id: Optional[str] = None) -> IndexingResult:
        # SHA256 duplicate detection
        file_hash = self.hash_service.compute_sha256_from_path(file_path)
        existing = Document.objects.filter(user=user, file_hash=file_hash, status='PROCESSED').first()
        if existing:
            logger.info("Duplicate detected for user=%s file_hash=%s", user.id, file_hash)
            return IndexingResult(document_id=str(existing.id), is_duplicate=True, chunks_indexed=existing.chunks.count(), message="reused")

        # create document record
        doc = Document.objects.create(
            user=user,
            display_name=filename,
            filename=filename,
            file_type=filename.split('.')[-1] if '.' in filename else 'txt',
            file_size=0,
            file_hash=file_hash,
            storage_path=file_path,
            source=source,
            status='PROCESSING',
        )

        try:
            pages, needs_ocr = self.extraction.extract(file_path)
            if needs_ocr:
                pages = self.ocr.ocr_from_path(file_path)

            cleaned_pages = []
            for p in pages:
                cleaned_pages.append({'page': p.get('page', 1), 'text': self.text_processor.clean_text(p.get('text', ''))})

            metadata_base = {
                'user_id': str(user.id),
                'document_id': str(doc.id),
                'filename': filename,
                'source': source,
                'upload_timestamp': datetime.utcnow(),
                'document_hash': file_hash,
                'document_type': doc.file_type,
                'google_drive_file_id': google_drive_file_id,
            }

            chunks: List[Chunk] = self.chunk_service.create_chunks(cleaned_pages, metadata_base)
            if not chunks:
                doc.status = 'FAILED'
                doc.save(update_fields=['status'])
                raise ExtractionError('No text found after extraction and OCR')

            texts = []
            metadatas = []
            ids = []
            db_chunks = []
            for c in chunks:
                vid = f"doc_{doc.id}_chunk_{c.metadata.chunk_index}"
                ids.append(vid)
                texts.append(c.text)
                metadatas.append({
                    'user_id': c.metadata.user_id,
                    'document_id': c.metadata.document_id,
                    'filename': c.metadata.filename,
                    'page_number': c.metadata.page_number,
                    'chunk_index': c.metadata.chunk_index,
                    'source': c.metadata.source,
                    'upload_timestamp': c.metadata.upload_timestamp.isoformat(),
                    'document_hash': c.metadata.document_hash,
                    'document_type': c.metadata.document_type,
                    'google_drive_file_id': c.metadata.google_drive_file_id,
                })
                db_chunks.append(DocumentChunk(document=doc, chunk_index=c.metadata.chunk_index, content=c.text, vector_id=vid, page_number=c.metadata.page_number))

            DocumentChunk.objects.bulk_create(db_chunks)

            embedding_objs = self.embedding_service.embed_batch(chunks)
            vectors = [e.vector for e in embedding_objs]

            self.store.add_embeddings(ids=ids, vectors=vectors, metadatas=metadatas, documents=texts)

            doc.status = 'PROCESSED'
            doc.save(update_fields=['status'])

            return IndexingResult(document_id=str(doc.id), is_duplicate=False, chunks_indexed=len(chunks), message='indexed')

        except Exception:
            logger.exception('Indexing failed')
            doc.status = 'FAILED'
            doc.save(update_fields=['status'])
            raise
