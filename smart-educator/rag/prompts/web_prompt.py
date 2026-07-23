from typing import List, Dict
from ..schemas import RetrievalChunk


def build_web_prompt(question: str, internal: List[RetrievalChunk], web_results: List[Dict]) -> str:
    internal_parts = []
    for c in internal:
        md = c.metadata
        title = getattr(md, 'filename', md.document_id if hasattr(md, 'document_id') else 'Document')
        internal_parts.append(f"[INTERNAL: {title} | Page:{getattr(md,'page_number',1)} | Chunk:{getattr(md,'chunk_index',0)}]\n{c.page_content}")

    web_parts = []
    for w in web_results:
        web_parts.append(f"[WEB: {w.get('title','')}] {w.get('snippet','')} -- {w.get('url','')}")

    prompt = (
        "You are an educational assistant. Use INTERNAL documents first. Use web results only when necessary. "
        "Prefer internal sources if both contain same information. Cite sources. Do not hallucinate.\n\n"
        f"Question: {question}\n\n"
        "INTERNAL CONTEXT:\n" + "\n\n".join(internal_parts) + "\n\n"
        "WEB RESULTS:\n" + "\n\n".join(web_parts) + "\n\nAnswer:"
    )
    return prompt
