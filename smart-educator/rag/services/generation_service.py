import os
import logging
import time
from typing import Tuple, Optional
import requests
from requests.adapters import HTTPAdapter, Retry
from ..config import TEMPERATURE, MAX_OUTPUT_TOKENS

logger = logging.getLogger(__name__)


class GenerationService:
    """
    Robust multi-provider generation service (AnythingLLM / Onyx pattern):
    - Primary: Groq (ultra-low latency with openai/gpt-oss-120b and qwen/qwen3.8-27b)
    - Fallback: Google Gemini (gemini-2.5-flash and gemini-flash-latest)
    - Context-grounded synthesizer fallback if API limits are exceeded
    """

    def __init__(self, api_key: Optional[str] = None, api_url: Optional[str] = None, timeout: int = 40):
        self.api_key = api_key or os.environ.get('GEMINI_API_KEY')
        self.api_url = api_url or os.environ.get('GEMINI_API_URL')
        self.timeout = timeout
        self.session = requests.Session()
        retries = Retry(total=2, backoff_factor=0.5, status_forcelist=[502, 503, 504])
        self.session.mount('https://', HTTPAdapter(max_retries=retries))

    def generate(
        self,
        prompt: str,
        temperature: float = 0.2,
        max_tokens: int = MAX_OUTPUT_TOKENS,
        timeout: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> Tuple[str, dict]:
        """Synchronous generation call supporting Groq and Gemini with fallback."""
        timeout = timeout or self.timeout
        groq_key = os.environ.get('GROQ_API_KEY')
        gemini_key = self.api_key or os.environ.get('GEMINI_API_KEY')

        system_instruction = system_prompt or (
            "You are SmartEducator AI, an elite academic and educational tutor. "
            "Deliver comprehensive, deeply structured explanations using clear Markdown H1/H2/H3 headers, "
            "well-formatted GFM tables (| Col1 | Col2 |), bullet points, and clean LaTeX math equations "
            "($...$ for inline and $$...$$ for display equations). Always cite sources inline using bracket notation like [1], [2]."
        )

        # 1. Try Groq (High throughput, reliable reasoning)
        if groq_key:
            groq_models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']
            for model_name in groq_models:
                try:
                    resp = self.session.post(
                        'https://api.groq.com/openai/v1/chat/completions',
                        headers={'Authorization': f'Bearer {groq_key}', 'Content-Type': 'application/json'},
                        json={
                            'model': model_name,
                            'messages': [
                                {'role': 'system', 'content': system_instruction},
                                {'role': 'user', 'content': prompt}
                            ],
                            'temperature': temperature,
                            'max_tokens': max_tokens
                        },
                        timeout=timeout
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        content = data['choices'][0]['message']['content']
                        logger.info("Generation succeeded using Groq model=%s", model_name)
                        return content, data
                    else:
                        logger.warning("Groq model %s returned status %d: %s", model_name, resp.status_code, resp.text[:150])
                except Exception as e:
                    logger.warning("Groq model %s attempt failed: %s", model_name, e)

        # 2. Try Google Gemini
        if gemini_key:
            gem_models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro', 'gemini-pro-latest']
            for gem_model in gem_models:
                try:
                    url = f'https://generativelanguage.googleapis.com/v1beta/models/{gem_model}:generateContent?key={gemini_key}'
                    payload = {
                        'contents': [{'parts': [{'text': f"{system_instruction}\n\n{prompt}"}]}],
                        'generationConfig': {
                            'temperature': temperature,
                            'maxOutputTokens': max_tokens
                        }
                    }
                    resp = self.session.post(
                        url,
                        headers={'Content-Type': 'application/json'},
                        json=payload,
                        timeout=timeout
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        content = data['candidates'][0]['content']['parts'][0]['text']
                        logger.info("Generation succeeded using Gemini model=%s", gem_model)
                        return content, data
                    else:
                        logger.warning("Gemini model %s returned status %d: %s", gem_model, resp.status_code, resp.text[:150])
                except Exception as e:
                    logger.warning("Gemini model %s attempt failed: %s", gem_model, e)

        # 3. Fallback extraction directly from prompt context
        logger.info("Generating synthesis from prompt context chunks")
        if "STUDY MATERIAL CONTEXT:" in prompt or "Context:" in prompt:
            delim = "STUDY MATERIAL CONTEXT:" if "STUDY MATERIAL CONTEXT:" in prompt else "Context:"
            context_section = prompt.split(delim)[-1].split("ANSWER:")[0].strip()
            lines = [l for l in context_section.split("\n") if l.strip() and not l.startswith("---") and not l.startswith("[Source")]
            extracted = "\n\n".join(lines[:8])
            text = (
                f"# Summary from Uploaded Study Materials\n\n"
                f"### Core Findings\n{extracted}\n\n"
                f"---\n"
                f"*Synthesized from indexed context chunks. Please ensure full LLM API connectivity for complete generation.*"
            )
            return text, {'fallback': True}

        return "I couldn't find enough information in your uploaded study material.", {'insufficient': True}
