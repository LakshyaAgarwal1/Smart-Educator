from typing import List
from ..schemas import RetrievalChunk


def build_exam_prompt(question: str, chunks: List[RetrievalChunk]) -> str:
    context_parts = []
    for c in chunks:
        md = c.metadata
        title = getattr(md, 'filename', md.document_id if hasattr(md, 'document_id') else 'Document')
        context_parts.append(f"[Doc:{title} Page:{getattr(md,'page_number',1)} Chunk:{getattr(md,'chunk_index',0)}]\n{c.page_content}")

    context = "\n\n".join(context_parts)
    prompt = (
        "You are an academic assistant. Answer the question using ONLY the provided context.\n"
        "Do NOT use external knowledge or guess. If the answer is not present, say: 'I couldn't find enough information in your uploaded study material.'\n\n"
        f"Question: {question}\n\nContext:\n{context}\n\nAnswer:"
    )
    return prompt
