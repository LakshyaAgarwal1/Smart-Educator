import re
from typing import List, Dict, Any, Optional
from ..schemas import RetrievalChunk
from datetime import datetime


def _get_val(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _extract_cited_tags(text: str) -> set:
    if not text:
        return set()
    # Match [1], [W1], 【1】, 【W1】, [[1]], [[W1]], [1, 2], etc.
    raw_bracketed = re.findall(r'[\[【]([^\]】]+)[\]】]', text)
    cited_tags = set()
    for item in raw_bracketed:
        matches = re.findall(r'\b(W?[0-9]+)\b', item, re.IGNORECASE)
        for m in matches:
            cited_tags.add(m.upper())
    return cited_tags


def build_citations(
    retrieved_chunks: List[RetrievalChunk],
    web_results: List[Dict[str, Any]] = None,
    answer_text: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Constructs structured citation metadata matching Onyx and AnythingLLM standards:
    - Provides explicit indexing (`1`, `2` for internal and `W1`, `W2` for web)
    - If answer_text is provided, strictly filters citations to ONLY those sources
      actually cited in the text (supporting both ASCII [1] and Unicode 【1】 citations).
    - If no sources were cited in the answer text, returns an empty list.
    """
    all_citations = []
    for idx, c in enumerate(retrieved_chunks, 1):
        md = getattr(c, 'metadata', {})
        title = _get_val(md, 'title') or _get_val(md, 'filename') or f'Document {idx}'
        filename = _get_val(md, 'filename') or title
        page = _get_val(md, 'page_number', 1)
        chunk_idx = _get_val(md, 'chunk_index', idx)
        source_type = _get_val(md, 'source', 'UPLOAD')

        score_val = float(getattr(c, 'score', 0.88) or 0.88)
        relevance = min(98, max(50, int(score_val * 100) if score_val <= 1.0 else min(98, int(score_val * 8))))

        all_citations.append({
            'id': str(idx),
            'index': idx,
            'cite_tag': f"[{idx}]",
            'type': 'internal',
            'title': title,
            'filename': filename,
            'page': page,
            'page_number': page,
            'chunk_index': chunk_idx,
            'source_type': source_type,
            'relevance': relevance,
            'confidence': round(relevance / 100.0, 2),
            'preview': getattr(c, 'page_content', '')[:180] if hasattr(c, 'page_content') else '',
        })

    if web_results:
        for w_idx, w in enumerate(web_results, 1):
            all_citations.append({
                'id': f"W{w_idx}",
                'index': f"W{w_idx}",
                'cite_tag': f"[W{w_idx}]",
                'type': 'web',
                'title': w.get('title') or 'Web Reference',
                'website_title': w.get('title'),
                'url': w.get('url'),
                'snippet': w.get('snippet'),
                'relevance': 85,
                'retrieved_at': datetime.utcnow().isoformat(),
            })

    # If answer_text is provided, strictly filter citations to only those actually cited
    if answer_text is not None:
        cited_tags = _extract_cited_tags(answer_text)
        if not cited_tags:
            # The answer text did not cite any source; do NOT return unused candidates
            return []

        filtered = []
        for c in all_citations:
            c_id = str(c.get('index', '') or c.get('id', '')).upper()
            cite_tag_num = c.get('cite_tag', '').strip('[]【】').upper()
            if c_id in cited_tags or cite_tag_num in cited_tags:
                filtered.append(c)
        return filtered

    return all_citations

