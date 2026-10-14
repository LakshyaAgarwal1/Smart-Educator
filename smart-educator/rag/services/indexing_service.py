import logging
from typing import List, Optional
from datetime import datetime
from pathlib import Path
from django.conf import settings

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
    - Extraction with Gemini Vision OCR fallback
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
        if existing and existing.chunks.count() > 0:
            logger.info("Duplicate detected for user=%s file_hash=%s", user.id, file_hash)
            return IndexingResult(document_id=str(existing.id), is_duplicate=True, chunks_indexed=existing.chunks.count(), message="reused")

        if existing:
            doc = existing
            doc.status = 'PROCESSING'
            doc.save(update_fields=['status'])
        else:
            # create document record
            doc = Document.objects.create(
                user=user,
                display_name=filename,
                filename=filename,
                file_type=filename.split('.')[-1].upper() if '.' in filename else 'TXT',
                file_size=Path(file_path).stat().st_size if Path(file_path).exists() else 0,
                file_hash=file_hash,
                storage_path=file_path,
                source=source,
                status='PROCESSING',
            )

        return self.index_document(doc, google_drive_file_id=google_drive_file_id)

    def index_document(self, doc: Document, google_drive_file_id: Optional[str] = None) -> IndexingResult:
        """Indexes an existing Document model instance into SQLite chunks and ChromaDB vectors."""
        file_path = doc.storage_path
        if not Path(file_path).is_absolute():
            # Resolve relative to MEDIA_ROOT
            full_path = Path(settings.MEDIA_ROOT) / file_path
            if full_path.exists():
                file_path = str(full_path)

        try:
            pages = []
            needs_ocr = False
            try:
                pages, needs_ocr = self.extraction.extract(file_path)
            except Exception as e:
                logger.warning("Standard extraction failed for doc_id=%s: %s; falling back to OCR", doc.id, e)
                needs_ocr = True

            # If pages are empty or lack meaningful text, trigger OCR
            has_text = any(p.get('text', '').strip() for p in pages) if pages else False
            if needs_ocr or not has_text:
                logger.info("Running Gemini Vision OCR for doc_id=%s (%s)", doc.id, doc.filename)
                pages = self.ocr.ocr_from_path(file_path)

            cleaned_pages = []
            for p in pages:
                cleaned_text = self.text_processor.clean_text(p.get('text', ''))
                if cleaned_text:
                    cleaned_pages.append({'page': p.get('page', 1), 'text': cleaned_text})

            metadata_base = {
                'user_id': str(doc.user.id),
                'document_id': str(doc.id),
                'filename': doc.filename,
                'source': doc.source,
                'upload_timestamp': datetime.utcnow(),
                'document_hash': doc.file_hash,
                'document_type': doc.file_type,
                'google_drive_file_id': google_drive_file_id,
            }

            chunks: List[Chunk] = self.chunk_service.create_chunks(cleaned_pages, metadata_base)
            if not chunks:
                doc.status = 'FAILED'
                doc.save(update_fields=['status'])
                raise ExtractionError(f'No text found after extraction and OCR for doc {doc.id}')

            # Clear existing chunks for clean re-indexing if any existed
            doc.chunks.all().delete()

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
                    'google_drive_file_id': c.metadata.google_drive_file_id or '',
                })
                db_chunks.append(DocumentChunk(
                    document=doc,
                    chunk_index=c.metadata.chunk_index,
                    content=c.text,
                    vector_id=vid,
                    page_number=c.metadata.page_number
                ))

            DocumentChunk.objects.bulk_create(db_chunks)

            # Compute Gemini embeddings and store in ChromaDB
            embedding_objs = self.embedding_service.embed_batch(chunks)
            vectors = [e.vector for e in embedding_objs if e is not None]

            if vectors and len(vectors) == len(ids):
                self.store.add_embeddings(ids=ids, vectors=vectors, metadatas=metadatas, documents=texts)
                logger.info("Successfully added %d embeddings to ChromaDB for doc_id=%s", len(vectors), doc.id)
            else:
                logger.warning("Embedding count (%d) mismatch with chunk count (%d) for doc_id=%s", len(vectors), len(ids), doc.id)

            doc.page_count = max(len(cleaned_pages), 1)
            doc.status = 'PROCESSED'
            doc.save(update_fields=['status', 'page_count'])

            return IndexingResult(document_id=str(doc.id), is_duplicate=False, chunks_indexed=len(chunks), message='indexed')

        except Exception:
            logger.exception('Indexing failed for doc_id=%s', doc.id)
            doc.status = 'FAILED'
            doc.save(update_fields=['status'])
            raise
