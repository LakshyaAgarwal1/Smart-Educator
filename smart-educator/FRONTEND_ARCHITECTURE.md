Frontend Architecture - Smart Educator

Overview

This document describes the frontend structure, reusable components, and guidance for maintaining and extending the UI. It assumes the repository root is the Django project `smart-educator`.

Goals achieved
- Consolidated shared UI utilities to `static/js/utils.js` (CSRF, global loading, modal helpers, toast).
- Reduced duplicated cookie/CSRF logic in `chat.js` and `documents.js` by using `utils.getCSRF()`.
- Introduced reusable account styles `static/css/accounts.css` and JS `static/js/accounts.js` for Profile/Settings pages.
- Modular templates: most pages extend `templates/base.html` and include component snippets under `templates/components/`.
- Added `FRONTEND_ARCHITECTURE.md` and a small refactor report.

Directory conventions
- templates/
  - components/: small HTML fragments that can be included in many pages (sidebar, topbar, chat_input, message, sources_panel, modals)
  - accounts/, documents/, chat/: feature templates
  - base.html: main layout that loads CSS + shared JS
- static/
  - css/: stylesheets. Keep global variables in `base.css` and feature-specific styles in separate files (e.g., `accounts.css`, `chat.css`).
  - js/: client-side behavior. Prefer small modules: `utils.js`, `main.js`, `sidebar.js`, `chat.js`, `documents.js`, `accounts.js`.

Best practices adopted
- Shared utilities: `static/js/utils.js` exposes helpers (`getCSRF`, `csrfFetch`, `showGlobalLoading`, `openModal`, `toast`). Import by including `utils.js` early in `base.html`.
- Keep templates small: create fragments in `templates/components/` and include using `{% include 'components/name.html' %}`.
- Data attributes for dynamic behavior: document cards include `data-*` attributes (id, type, status, size, date) to allow client-side logic without extra JSON APIs.
- Progressive enhancement: all pages should render server-side HTML and be enhanced by JS when available.
- Local settings: store temporary UI preferences in `localStorage` (accounts settings) until a server-side settings endpoint is added.

JavaScript guidelines
- Avoid global duplication — place common helpers in `utils.js` and call `window.utils.*`.
- Prefer `fetch` (or `utils.csrfFetch`) for API calls; use `FormData` for file uploads and `XMLHttpRequest` only when upload progress is required.
- Keep page-specific logic in separate files and include them after `utils.js` in `base.html`.
- Debounce search inputs if they are wired to network calls (not required for instant local filtering).

CSS guidelines
- Centralize design tokens (colors, radii, spacing) in `static/css/base.css`.
- Feature styles should be isolated (e.g., `accounts.css`) and loaded only when needed via `{% block head_extra %}` in templates.
- Prefer utility classes (Tailwind) for layout; keep bespoke classes for complex components.
- Use `html.dark` to control dark-mode variables across the app.

Accessibility
- Modals: include `role="dialog"` + `aria-modal="true"` and a title `aria-labelledby`.
- Toasts: use an `aria-live` polite region for non-blocking messages.
- Keyboard shortcuts: register global shortcuts carefully and avoid conflicts; Esc should close modals (add as needed).

Testing & validation
- Manual: run `py manage.py runserver` and exercise pages (Profile, Documents, Chat) with JS enabled.
- Automated: add frontend smoke tests (Selenium/Playwright) later to validate dynamic flows.

Next steps (recommended)
1. Introduce a small build step (npm + esbuild/rollup) to bundle and minify JS for production.
2. Consolidate CSS into fewer files and run PurgeCSS (Tailwind purge) in build to reduce size.
3. Add server-side user settings endpoints to persist preferences and remove reliance on `localStorage`.
4. Replace heuristic HTML parsing for chat/document refresh with lightweight JSON endpoints for robustness.

Contact
- For follow-up refactors, request specific feature areas (templates, JS bundling, CSS build) and I will prepare a targeted plan and PR.
