from typing import List, Dict, Any
from ..schemas import RetrievalChunk
from datetime import datetime


def build_citations(retrieved_chunks: List[RetrievalChunk], web_results: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    citations = []
    for c in retrieved_chunks:
        md = c.metadata
        citations.append({
            'type': 'internal',
            'document_title': getattr(md, 'filename', None),
            'page_number': getattr(md, 'page_number', None),
            'chunk_index': getattr(md, 'chunk_index', None),
            'source_type': getattr(md, 'source', None),
            'confidence': float(c.score or 0.0),
        })

    if web_results:
        for w in web_results:
            citations.append({
                'type': 'web',
                'website_title': w.get('title'),
                'url': w.get('url'),
                'snippet': w.get('snippet'),
                'retrieved_at': datetime.utcnow().isoformat(),
            })

    return citations
