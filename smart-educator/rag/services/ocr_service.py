import os
import io
import time
import base64
import logging
from typing import List, Optional
import requests
from ..exceptions import ExtractionError

logger = logging.getLogger(__name__)


class OCRService:
    """OCR service utilizing PyMuPDF (fitz) for page rendering and Gemini Vision for multimodal transcription."""

    @classmethod
    def _gemini_ocr_image(cls, img_bytes: bytes, mime_type: str = "image/jpeg", custom_prompt: Optional[str] = None) -> str:
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ExtractionError("GEMINI_API_KEY is not configured for OCR")

        prompt = custom_prompt or (
            "You are an expert academic and legal document OCR engine. "
            "Transcribe all text, numbers, headings, tables, labels, and notes from this document page with high fidelity. "
            "Preserve original language (e.g. Marathi, Hindi, Devanagari, English). "
            "If this document is a 7/12 (Satbara Utara) land record, property card, or government extract, "
            "make sure to transcribe and clearly label all sections: "
            "1. Village (Gaon), Taluka, District (Jilha), Survey/Gat Number, Sub-division (Hissa), ULPIN. "
            "2. Gaon Namuna Saat (Village Form 7 - Adhikar Abhilekh / Record of Rights), including Occupant / Khatedar names, Khata numbers, Land tenure/type (Bhogwata Varg), Total Area (Hectare-Are), Pot Kharaba (uncultivable land), Cultivable Area, Assessment/Judi, Mutation/Ferfar numbers, Encumbrances/Boja/Loans. "
            "3. Gaon Namuna Bara (Village Form 12 - Pik Pahani / Register of Crops), including Year, Season, Crop names, Irrigated/Unirrigated area, Water source. "
            "Provide the transcription in clean, structured Markdown format."
        )

        img_b64 = base64.b64encode(img_bytes).decode('utf-8')
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": img_b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 2500
            }
        }

        import itertools
        if not hasattr(cls, '_model_cycle'):
            cls._candidate_pool = [
                'gemini-flash-lite-latest',
                'gemini-3.8-flash',
                'gemini-flash-latest',
                'gemini-3.5-flash-lite',
                'gemini-3.1-flash-lite',
            ]
            cls._model_idx = 0

        # Round-robin starting model
        cls._model_idx = (cls._model_idx + 1) % len(cls._candidate_pool)
        candidate_models = cls._candidate_pool[cls._model_idx:] + cls._candidate_pool[:cls._model_idx]

        last_error = None
        for cycle in range(2):
            for model in candidate_models:
                for attempt in range(2):
                    try:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                        resp = requests.post(url, json=payload, timeout=25)
                        if resp.status_code == 200:
                            data = resp.json()
                            candidates = data.get('candidates', [])
                            if candidates:
                                parts = candidates[0].get('content', {}).get('parts', [])
                                if parts:
                                    text = parts[0].get('text', '').strip()
                                    if text:
                                        logger.info("Gemini Vision OCR succeeded using model=%s", model)
                                        return text
                        elif resp.status_code == 429:
                            logger.warning("Gemini model %s 429 rate limit reached, switching to alternative model...", model)
                            last_error = resp.text
                            # Switch immediately to next model in pool
                            break
                        elif resp.status_code == 503:
                            logger.warning("Gemini model %s 503 spike, retrying after pause...", model)
                            time.sleep(1.0)
                            continue
                        else:
                            logger.warning("Gemini Vision OCR with model %s returned status %d: %s", model, resp.status_code, resp.text[:200])
                            last_error = resp.text
                            break
                    except Exception as e:
                        logger.warning("Gemini Vision OCR attempt %d failed for model %s: %s", attempt + 1, model, e)
                        last_error = str(e)
                        time.sleep(0.5)

            if cycle == 0:
                logger.info("All Gemini OCR models currently rate-limited; pausing 5 seconds before cycle retry...")
                time.sleep(5.0)

        raise ExtractionError(f"Gemini Vision OCR failed across models: {last_error}")

    @classmethod
    def ocr_from_path(cls, path: str) -> List[dict]:
        ext = (path or '').lower().rsplit('.', 1)[-1]
        pages = []
        try:
            if ext == 'pdf':
                import fitz  # PyMuPDF
                from concurrent.futures import ThreadPoolExecutor, as_completed
                doc = fitz.open(path)
                num_pages = len(doc)
                page_results = [None] * num_pages
                tasks = []

                for page_idx in range(num_pages):
                    page = doc[page_idx]
                    # Check if fitz can extract native text directly
                    native_text = (page.get_text() or '').strip()
                    if native_text and len(native_text) > 40:
                        page_results[page_idx] = {'page': page_idx + 1, 'text': native_text}
                        continue

                    # Render page as JPEG image at 120 DPI for fast and high-accuracy Gemini Vision OCR
                    pix = page.get_pixmap(dpi=120)
                    img_bytes = pix.tobytes('jpg', jpg_quality=85)
                    tasks.append((page_idx, img_bytes))
                doc.close()

                if tasks:
                    logger.info("Executing parallel Gemini Vision OCR on %d pages (concurrency: %d)...", len(tasks), min(len(tasks), 5))

                    def _worker(item):
                        p_idx, b = item
                        ocr_txt = cls._gemini_ocr_image(b, mime_type="image/jpeg")
                        return p_idx, ocr_txt

                    with ThreadPoolExecutor(max_workers=min(len(tasks), 5)) as pool:
                        futures = [pool.submit(_worker, t) for t in tasks]
                        for f in as_completed(futures):
                            p_idx, ocr_txt = f.result()
                            page_results[p_idx] = {'page': p_idx + 1, 'text': ocr_txt}

                pages = [res for res in page_results if res is not None]
            elif ext in ('png', 'jpg', 'jpeg', 'webp', 'bmp'):
                with open(path, 'rb') as f:
                    img_bytes = f.read()
                mime = 'image/jpeg' if ext in ('jpg', 'jpeg') else f'image/{ext}'
                ocr_text = cls._gemini_ocr_image(img_bytes, mime_type=mime)
                pages.append({'page': 1, 'text': ocr_text})
            else:
                logger.warning("Unsupported file type for OCR: %s", ext)
            return pages
        except Exception as e:
            logger.exception("OCR extraction failed for path=%s: %s", path, e)
            raise ExtractionError(str(e))
