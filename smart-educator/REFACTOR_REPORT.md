Refactor Report - Duplication & Reusable Components

Summary of findings

1) CSRF & cookie helpers duplicated
- `static/js/chat.js` and `static/js/documents.js` each contained a `getCookie()` helper and read the CSRF token directly.
- Action: consolidated into `static/js/utils.js` and updated callers to use `window.utils.getCSRF()`.

2) Global loading & modal handling
- Multiple files implemented local versions of loading indicators and modal open/close handling.
- Action: `utils.showGlobalLoading()` introduced; main modal handling remains in `static/js/main.js` which listens to `data-modal-target` attributes.

3) Settings/Profile duplication
- A settings page existed and profile had repeated markup. The profile was modernized and a settings modal was embedded to avoid new routes.

4) Documents stats and scraping
- Storage/stat computation required additional attributes on server-rendered document cards. Added `data-size` to cards to allow client-side aggregation without backend changes.

5) CSS isolation
- Introduced `static/css/accounts.css` to host shared account-related styles and reduce duplication. More consolidation recommended across other CSS files.

Refactor notes and recommendations
- Introduce an asset build pipeline (npm + esbuild/rollup) to minify and bundle JS/CSS for production; serve hashed filenames.
- Add JSON endpoints for key flows (chat messages, documents list) instead of HTML scraping.
- Consolidate shared components in `templates/components/` and convert repeated blocks to includes.
- Add a linter / formatter for JS and CSS and enforce in CI.

Files changed (high level)
- Added: `static/js/utils.js`
- Updated: `static/js/chat.js`, `static/js/documents.js` to use `utils.js`
- Added: `static/css/accounts.css`
- Updated: `templates/accounts/profile.html` (new layout + settings modal)
- Updated: `templates/components/sidebar.html` (settings link)
- Updated: `templates/documents/list.html` (data-size attribute)
- Added documentation: `FRONTEND_ARCHITECTURE.md`, `REFACTOR_REPORT.md`

Next actionable steps
- Implement build tooling (esbuild) and add npm scripts.
- Remove any remaining duplicated utility code across other JS files.
- Consolidate topbar, sidebar, modals into purely reusable components in `templates/components/`.
- Add unit tests or Playwright scripts to validate critical flows (upload, sync, chat, rag queries).

If you approve, I'll prepare a follow-up PR that adds a minimal npm-based build (esbuild), bundles JS/CSS, and updates `base.html` to load optimized assets (production-ready).
