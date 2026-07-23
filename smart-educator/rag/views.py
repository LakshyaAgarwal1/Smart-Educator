from django.shortcuts import render

# Create your views here.

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser

from .services.extraction import extract_text_from_file
from .services.ingestion import ingest_document
from .services.retrieval_service import retrieve_hybrid_chunks
from .services.reranker import rerank_chunks
from .services.generation import rewrite_query, generate_answer

logger = logging.getLogger(__name__)


class DocumentUploadView(APIView):
    """
    Handles file upload, SHA256 duplicate detection, two-stage semantic chunking,
    relational database chunk mirroring, and ChromaDB vector indexing.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        title = request.data.get("title")
        uploaded_file = request.FILES.get("file")

        if not title or not uploaded_file:
            return Response(
                {"error": "Both 'title' and 'file' parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Step 1: Text extraction with OCR fallback + SHA256 hash calculation
            extracted_text, file_hash = extract_text_from_file(uploaded_file)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            return Response(
                {"error": "Failed to process the uploaded file format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not extracted_text.strip():
            return Response(
                {"error": "No readable text could be extracted from this file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Step 2: Ingest document with SHA256 deduplication & two-stage semantic chunking
            doc, is_duplicate = ingest_document(
                user=request.user,
                title=title,
                raw_text=extracted_text,
                file_hash=file_hash,
                filename=uploaded_file.name,
                source="UPLOAD"
            )

            return Response(
                {
                    "document_id": str(doc.id),
                    "title": doc.display_name,
                    "filename": doc.filename,
                    "is_duplicate": is_duplicate,
                    "extracted_chars": len(extracted_text),
                    "status": doc.status,
                    "message": "Document re-used from existing index." if is_duplicate else "Document successfully processed and indexed."
                },
                status=status.HTTP_200_OK if is_duplicate else status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            return Response(
                {"error": "Failed to ingest and index document."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DocumentQueryView(APIView):
    """
    Handles user queries through the end-to-end RAG pipeline:
    Query Rewriting -> Hybrid Retrieval (BM25 + Vector) -> Cross-Encoder Reranking
    -> Confidence Threshold Check -> Prompting -> Answer Generation with Citations.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        raw_query = request.data.get("query")
        mode = request.data.get("mode", "EXAM").upper()  # Options: EXAM, WEB
        chat_history = request.data.get("chat_history", [])  # Optional conversation history

        if not raw_query or not raw_query.strip():
            return Response(
                {"error": "Parameter 'query' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = str(request.user.id)

        # Step 1: Query Rewriting using conversation history
        standalone_query = rewrite_query(user_query=raw_query, chat_history=chat_history)

        # Step 2: Hybrid Retrieval (BM25 + Chroma Dense Vector Search)
        candidate_chunks = retrieve_hybrid_chunks(
            user_id=user_id,
            query=standalone_query,
            top_k=20
        )

        if not candidate_chunks:
            return Response(
                {
                    "answer": "I couldn't find enough relevant information in your uploaded documents.",
                    "sources": [],
                    "query_used": standalone_query,
                },
                status=status.HTTP_200_OK,
            )

        # Step 3: Cross-Encoder Reranking & Confidence Thresholding
        top_chunks, passes_threshold = rerank_chunks(
            query=standalone_query,
            retrieved_items=candidate_chunks,
            top_k=5
        )

        # Reject low-confidence results in EXAM mode to prevent hallucinations
        if not passes_threshold and mode == "EXAM":
            return Response(
                {
                    "answer": "I couldn't find enough relevant information in your uploaded documents.",
                    "sources": [],
                    "query_used": standalone_query,
                },
                status=status.HTTP_200_OK,
            )

        # Step 4: Answer Generation
        answer = generate_answer(
            query=standalone_query,
            retrieved_chunks=top_chunks,
            mode=mode
        )

        # Step 5: Format Source Citations for Frontend
        sources = []
        for chunk, reranker_score in top_chunks:
            metadata = getattr(chunk, 'metadata', {})
            content = getattr(chunk, 'page_content', str(chunk))
            sources.append({
                "document_id": metadata.get("document_id"),
                "title": metadata.get("title"),
                "filename": metadata.get("filename"),
                "chunk_index": metadata.get("chunk_index"),
                "page_number": metadata.get("page_number", 1),
                "relevance_score": round(reranker_score, 4),
                "preview": content[:150] + "..." if len(content) > 150 else content,
            })

        return Response(
            {
                "answer": answer,
                "sources": sources,
                "query_used": standalone_query,
                "mode": mode,
            },
            status=status.HTTP_200_OK,
        )