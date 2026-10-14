import katex from 'katex';
import { marked } from 'marked';

// Configure marked with GitHub Flavored Markdown and breaks
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Enterprise-grade Academic & RAG Formatter (Onyx / AnythingLLM standard).
 * Handles:
 * - Full GitHub Flavored Markdown (headings, tables, lists, code, quotes)
 * - LaTeX math equations ($...$ inline and $$...$$ display)
 * - Interactive inline citation badges ([1], [2], [W1], [[1]])
 */
export function renderMathAndText(text) {
  if (!text) return '';

  const mathBlocks = [];
  const mathInlines = [];

  // 1. Temporarily protect code blocks so math or citations inside code are not touched
  const codeBlocks = [];
  let processed = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    const token = `%%CODE_BLOCK_${codeBlocks.length}%%`;
    codeBlocks.push(match);
    return token;
  });

  // 2. Extract Display Math: $$ ... $$
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
    const token = `%%MATH_DISPLAY_${mathBlocks.length}%%`;
    try {
      mathBlocks.push(
        katex.renderToString(math.trim(), {
          displayMode: true,
          throwOnError: false,
        })
      );
    } catch (e) {
      mathBlocks.push(`<pre class="math-error text-red-500">${match}</pre>`);
    }
    return token;
  });

  // 3. Extract Inline Math: $ ... $ (ignoring pure numbers/currency like $50 or $ 100)
  processed = processed.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (match, math) => {
    const trimmed = math.trim();
    if (!trimmed || /^\d+(\.\d+)?$/.test(trimmed) || /^\s*\d+/.test(trimmed)) {
      return match;
    }
    const token = `%%MATH_INLINE_${mathInlines.length}%%`;
    try {
      mathInlines.push(
        katex.renderToString(trimmed, {
          displayMode: false,
          throwOnError: false,
        })
      );
    } catch (e) {
      mathInlines.push(match);
    }
    return token;
  });

  // 4. Restore code blocks
  processed = processed.replace(/%%CODE_BLOCK_(\d+)%%/g, (_, idx) => codeBlocks[idx]);

  // 5. Convert inline citation tags ([1], [2], [W1], [[1]]) to interactive badges
  // (Avoid matching markdown links [text](url))
  processed = processed.replace(/\[\[?([0-9]+|W[0-9]+)\]?\](?!\()/g, (match, citeId) => {
    return `<span class="inline-citation" data-cite="${citeId}" title="Source ${citeId}">[${citeId}]</span>`;
  });

  // 6. Parse Markdown via marked (supports tables, headers, lists, code, blockquotes)
  let html = '';
  try {
    html = marked.parse(processed);
  } catch (err) {
    console.error('Marked parsing error:', err);
    html = processed;
  }

  // 7. Inject back LaTeX display math
  html = html.replace(/%%MATH_DISPLAY_(\d+)%%/g, (_, idx) => {
    return `<div class="katex-display-container my-3 overflow-x-auto py-1">${mathBlocks[idx]}</div>`;
  });

  // 8. Inject back LaTeX inline math
  html = html.replace(/%%MATH_INLINE_(\d+)%%/g, (_, idx) => {
    return `<span class="katex-inline-container inline-block">${mathInlines[idx]}</span>`;
  });

  return html;
}

export default renderMathAndText;
