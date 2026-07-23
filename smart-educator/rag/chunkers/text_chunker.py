import os
import logging
from typing import List
logger = logging.getLogger(__name__)


# Try to use LangChain semantic chunker when available, else fallback
_HAS_LANGCHAIN = True
try:
    from langchain_experimental.text_splitter import SemanticChunker  # type: ignore
    from langchain_huggingface import HuggingFaceEmbeddings  # type: ignore
    from langchain_text_splitters import RecursiveCharacterTextSplitter  # type: ignore
    import os
    os.environ.setdefault("HF_HOME", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "hf_cache"))
    embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    def get_semantic_chunker(breakpoint_type: str = "percentile", breakpoint_amount: int = 90) -> SemanticChunker:
        return SemanticChunker(
            embeddings=embedding_model,
            breakpoint_threshold_type=breakpoint_type,
            breakpoint_threshold_amount=breakpoint_amount,
        )

except Exception:
    _HAS_LANGCHAIN = False
    logger.info('LangChain semantic chunker not available; using fallback splitter')


def _hard_split(text: str, max_chunk_size: int, chunk_overlap: int) -> List[str]:
    parts = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + max_chunk_size, length)
        parts.append(text[start:end])
        start = end - chunk_overlap if end - chunk_overlap > start else end
    return parts


def chunk_document(text: str, min_chunk_size: int = 100, max_chunk_size: int = 1500, chunk_overlap: int = 150) -> List[str]:
    if not text or not text.strip():
        return []

    if _HAS_LANGCHAIN:
        try:
            semantic_splitter = get_semantic_chunker()
            raw_chunks = semantic_splitter.split_text(text)
        except Exception as e:
            logger.warning('Semantic chunking failed: %s', e)
            raw_chunks = [text]

        hard_splitter = RecursiveCharacterTextSplitter(
            chunk_size=max_chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""],
        )

        intermediate_chunks = []
        for chunk in raw_chunks:
            if len(chunk) > max_chunk_size:
                intermediate_chunks.extend(hard_splitter.split_text(chunk))
            else:
                intermediate_chunks.append(chunk)
    else:
        # fallback: split by paragraphs, then hard split
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        intermediate_chunks = []
        for p in paragraphs:
            if len(p) > max_chunk_size:
                intermediate_chunks.extend(_hard_split(p, max_chunk_size, chunk_overlap))
            else:
                intermediate_chunks.append(p)

    final_chunks = []
    for chunk in intermediate_chunks:
        if len(chunk) >= min_chunk_size:
            final_chunks.append(chunk)
        elif final_chunks:
            final_chunks[-1] += ' ' + chunk
        else:
            final_chunks.append(chunk)

    return final_chunks
