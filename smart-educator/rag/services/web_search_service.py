import os
import logging
import urllib.parse
import re
import html
from typing import List, Dict, Any
import requests
from ..config import WEB_TIMEOUT, MAX_WEB_RESULTS

logger = logging.getLogger(__name__)


def _extract_core_search_topic(query: str) -> str:
    q = query.strip()
    # 1. Strip prompt instructions: create a quiz on..., generate notes on..., explain...
    q = re.sub(
        r'^(create|generate|write|make|give\s+me|prepare|provide|draft|test|quiz|exam|summarize|explain)\s+(me\s+)?(a\s+)?(short\s+|quick\s+|detailed\s+|comprehensive\s+)?(quiz|test|exam|notes|summary|mcqs?|questions?|flashcards?)?\s*(on|about|for|of|regarding)?\s*(the\s+topic\s+of|the\s+subject\s+of|the\s+chapter\s+of|the)?\s*',
        '',
        q,
        flags=re.IGNORECASE
    ).strip()
    # 2. Strip question openers: what is, what are, tell me about...
    q = re.sub(r'^(what\s+is|what\s+are|who\s+is|how\s+does|how\s+do|can\s+you\s+explain|tell\s+me\s+about)\s+(the\s+|a\s+|an\s+)?', '', q, flags=re.IGNORECASE).strip()
    # 3. Strip trailing board / educational syllabus qualifiers
    q = re.sub(r'\b(as\s+per|according\s+to|based\s+on)\s+.*$', '', q, flags=re.IGNORECASE).strip()
    # 4. Strip trailing grade / class mentions
    q = re.sub(r'\bfor\s+(class|grade|standard|std)\s+[0-9]+(th)?(\s+students?)?.*$', '', q, flags=re.IGNORECASE).strip()
    q = re.sub(r'\b(in\s+simple\s+terms|with\s+examples|step\s+by\s+step).*$', '', q, flags=re.IGNORECASE).strip()
    # 5. Strip repository / vectorized database / file-format meta-phrases
    q = re.sub(r'\b(in|from)\s+(my\s+)?(vectorized\s+db|database|vectorstore|uploaded\s+files?|documents?)\b', '', q, flags=re.IGNORECASE).strip()
    q = re.sub(r'\b(pdf|docx|pptx|xlsx|txt)\b', '', q, flags=re.IGNORECASE).strip()
    clean = q.strip(' ?.,!:')
    return clean if len(clean) >= 3 else query


class WebSearchService:
    """
    Multi-engine web & academic search service inspired by AnythingLLM and Onyx:
    - Wikipedia Deep Article Extracts (authoritative encyclopedic foundations)
    - arXiv Academic Search (peer-reviewed scientific & research papers)
    - DuckDuckGo Knowledge Graph & Instant Answers
    - Fallback to Serper / Google Search if configured
    """

    def __init__(self, api_url: str = None, api_key: str = None, timeout: int = WEB_TIMEOUT):
        self.api_url = api_url or os.environ.get('WEB_SEARCH_API_URL')
        self.api_key = api_key or os.environ.get('SEARCH_API_KEY') or os.environ.get('WEB_SEARCH_API_KEY')
        self.timeout = timeout
        self.session = requests.Session()

    def search(self, query: str, max_results: int = MAX_WEB_RESULTS) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []

        # 1. Clean conversational query preambles for precise encyclopedic search
        search_terms = _extract_core_search_topic(query)
        substantive_tokens = [t.lower() for t in re.findall(r'\b\w+\b', search_terms) if len(t) > 2]

        # 2. Wikipedia Full Search + Deep Intro Extract (AnythingLLM / Onyx Encyclopedic standard)
        try:
            wiki_api = "https://en.wikipedia.org/w/api.php"
            resp = self.session.get(
                wiki_api,
                params={
                    'action': 'query',
                    'list': 'search',
                    'srsearch': search_terms,
                    'utf8': 1,
                    'format': 'json',
                    'srlimit': min(4, max_results)
                },
                headers={'User-Agent': 'SmartEducator/2.0 (Educational RAG Platform)'},
                timeout=self.timeout
            )
            if resp.status_code == 200:
                wiki_items = resp.json().get('query', {}).get('search', [])
                # Filter out disambiguation pages and music/film albums unless requested
                filtered_items = []
                for item in wiki_items:
                    t_lower = (item.get('title') or '').lower()
                    if any(bad in t_lower for bad in ['(disambiguation)', '(album)', '(film)', '(song)']):
                        continue
                    filtered_items.append(item)

                target_items = filtered_items if filtered_items else wiki_items
                titles_to_fetch = [item.get('title') for item in target_items if item.get('title')]

                # Fetch rich introductory text for the top Wikipedia articles
                if titles_to_fetch:
                    extract_resp = self.session.get(
                        wiki_api,
                        params={
                            'action': 'query',
                            'prop': 'extracts',
                            'exintro': 1,
                            'explaintext': 1,
                            'titles': '|'.join(titles_to_fetch[:3]),
                            'format': 'json'
                        },
                        headers={'User-Agent': 'SmartEducator/2.0 (Educational RAG Platform)'},
                        timeout=self.timeout
                    )
                    extract_pages = {}
                    if extract_resp.status_code == 200:
                        extract_pages = extract_resp.json().get('query', {}).get('pages', {})

                    for item in target_items:
                        title = item.get('title')
                        if not title:
                            continue

                        # Find matching extract if available
                        article_extract = ""
                        for _, pdata in extract_pages.items():
                            if pdata.get('title') == title and pdata.get('extract'):
                                article_extract = pdata.get('extract').strip()
                                break

                        snippet = article_extract if article_extract else re.sub(r'<[^>]+>', '', html.unescape(item.get('snippet', ''))).strip()
                        article_url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"

                        if article_url and not any(r['url'] == article_url for r in results):
                            results.append({
                                'title': f"{title} - Wikipedia",
                                'snippet': snippet[:600] if len(snippet) > 600 else snippet,
                                'url': article_url,
                                'source': 'Wikipedia'
                            })
        except Exception as e:
            logger.warning("Wikipedia search error: %s", e)

        # 3. arXiv Academic Search (only for specific high-level STEM/physics/CS research topics)
        arxiv_disciplines = {'quantum', 'relativity', 'neural network', 'deep learning', 'transformer architecture', 'algorithm complexity', 'particle physics', 'cosmology', 'differential equation', 'graph neural', 'string theory', 'general relativity'}
        is_academic_query = any(k in search_terms.lower() for k in arxiv_disciplines)
        if is_academic_query and len(results) < max_results:
            try:
                import xml.etree.ElementTree as ET
                arxiv_url = 'https://export.arxiv.org/api/query'
                arxiv_resp = self.session.get(
                    arxiv_url,
                    params={
                        'search_query': f'all:{search_terms}',
                        'start': 0,
                        'max_results': 2
                    },
                    timeout=self.timeout
                )
                if arxiv_resp.status_code == 200:
                    root = ET.fromstring(arxiv_resp.text)
                    for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
                        t_node = entry.find('{http://www.w3.org/2005/Atom}title')
                        s_node = entry.find('{http://www.w3.org/2005/Atom}summary')
                        id_node = entry.find('{http://www.w3.org/2005/Atom}id')
                        if t_node is not None and s_node is not None:
                            paper_title = t_node.text.strip().replace('\n', ' ')
                            paper_summary = s_node.text.strip().replace('\n', ' ')
                            # Require that the retrieved paper actually has keyword overlap with the search terms
                            paper_text = (paper_title + " " + paper_summary).lower()
                            if substantive_tokens and not any(t in paper_text for t in substantive_tokens):
                                continue

                            paper_url = id_node.text.strip() if id_node is not None else 'https://arxiv.org'
                            if not any(r['url'] == paper_url for r in results):
                                results.append({
                                    'title': f"{paper_title} - arXiv",
                                    'snippet': paper_summary[:500] + ('...' if len(paper_summary) > 500 else ''),
                                    'url': paper_url,
                                    'source': 'arXiv'
                                })
            except Exception as e:
                logger.debug("arXiv search error: %s", e)

        # 4. DuckDuckGo Instant Knowledge API
        if len(results) < max_results:
            try:
                ddg_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(search_terms)}&format=json&no_html=1&skip_disambig=1"
                ddg_resp = self.session.get(ddg_url, headers={'User-Agent': 'SmartEducator/2.0'}, timeout=self.timeout)
                if ddg_resp.status_code == 200:
                    data = ddg_resp.json()
                    abstract = data.get('AbstractText')
                    abs_url = data.get('AbstractURL')
                    abs_source = data.get('AbstractSource') or 'Web Reference'
                    heading = data.get('Heading') or search_terms

                    if abstract and not any(r['url'] == abs_url for r in results):
                        results.append({
                            'title': f"{heading} - {abs_source}",
                            'snippet': abstract,
                            'url': abs_url or ('https://duckduckgo.com/?q=' + urllib.parse.quote(search_terms)),
                            'source': abs_source
                        })

                    for topic in data.get('RelatedTopics', []):
                        if isinstance(topic, dict) and 'Text' in topic:
                            t_text = topic.get('Text')
                            t_url = topic.get('FirstURL')
                            t_title = t_text.split(' - ')[0] if ' - ' in t_text else t_text[:60]
                            if t_url and not any(r['url'] == t_url for r in results):
                                results.append({
                                    'title': t_title,
                                    'snippet': t_text,
                                    'url': t_url,
                                    'source': 'DuckDuckGo'
                                })
                            if len(results) >= max_results:
                                break
            except Exception as e:
                logger.warning("DuckDuckGo search error: %s", e)

        logger.info("WebSearchService fetched %d results for query='%s'", len(results), query)
        return results[:max_results]
