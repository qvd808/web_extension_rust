// Rendering-only module for the search overlay based on search.html/search.css
// Exposes DOM lifecycle and view updates; no business logic here.

let inited = false;
let host = null;        // fixed host attached to DOM (full-viewport container)
let shadow = null;      // ShadowRoot
let overlayRoot = null; // centers the overlay box; hidden by default
let overlayEl = null;   // .search-overlay (900x500 panel)
let inputEl = null;     // #search-input
let resultsEl = null;   // #results-container
let loadingEl = null;   // #loading
let previewTitleEl = null;  // .preview-title
let previewUrlEl = null;    // .preview-url
let previewContentEl = null; // .preview-content

function ensureAttached() {
  if (!host) return;
  const attach = () => {
    if (!document.documentElement.contains(host)) {
      document.documentElement.appendChild(host);
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach, { once: true });
  } else {
    attach();
  }
}

export function ensureSearchDOM() {
  if (inited) return refs();
  inited = true;

  host = document.createElement("div");
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";

  shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .overlay-root {
      position: fixed; inset: 0;
      display: none; /* toggled to flex when visible */
      align-items: center; justify-content: center;
      background: rgba(0,0,0,0.35);
      backdrop-filter: blur(2px);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif;
    }

    .search-overlay {
      width: 900px;
      height: 500px;
      background-color: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: row;
      overflow: hidden;
      animation: slideIn 0.2s ease-out;
      color: #e0e0e0;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .search-panel {
      width: 45%;
      display: flex;
      flex-direction: column;
      background-color: #242424;
      border-right: 1px solid #333;
    }

    #search-input {
      width: 100%;
      padding: 16px 20px;
      font-size: 15px;
      border: none;
      border-bottom: 2px solid #333;
      background-color: #1a1a1a;
      color: #e0e0e0;
      outline: none;
      transition: border-color 0.2s;
    }
    #search-input::placeholder { color: #666; }
    #search-input:focus { border-bottom-color: #4a9eff; background-color: #1e1e1e; }

    #results-container {
      flex: 1;
      overflow-y: auto;
      background-color: #242424;
      padding: 0;
    }

    .result-item {
      padding: 12px 20px;
      cursor: pointer;
      border-bottom: 1px solid #2a2a2a;
      transition: all 0.15s ease;
      position: relative;
    }
    .result-item:hover { background-color: #2d2d2d; }
    .result-item.selected {
      background-color: #2a4a6a;
      border-left: 3px solid #4a9eff;
      padding-left: 17px;
    }
    .result-item.selected::before {
      content: "▶";
      position: absolute; right: 16px;
      color: #4a9eff; font-size: 10px;
    }
    .result-title {
      font-size: 14px; color: #e0e0e0; margin-bottom: 4px; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .result-group { font-size: 11px; color: #888; }
    .result-item.selected .result-title { color: #fff; }
    .result-item.selected .result-group { color: #aaa; }
    .no-results { padding: 40px 20px; text-align: center; color: #666; font-size: 13px; }

    .preview-panel {
      width: 55%;
      background-color: #1a1a1a;
      padding: 24px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.6;
      color: #d4d4d4;
    }
    .preview-panel .preview-title {
      font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 12px;
      padding-bottom: 12px; border-bottom: 2px solid #333; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
  .preview-panel .preview-content { color: #aaa; font-size: 13px; line-height: 1.8; white-space: pre-wrap; }
  .preview-panel .preview-url { color: #4a9eff; font-size: 12px; margin-bottom: 20px; word-break: break-all; line-height: 1.5; }
  .preview-panel .preview-meta-row { margin: 4px 0; }
  .preview-panel .preview-label { font-weight: 600; color: #ddd; margin-right: 6px; }
  .preview-panel .preview-value { color: #bbb; }
    #loading { text-align: center; color: #858585; padding: 20px; font-size: 13px; }

    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #1a1a1a; }
    ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #555; }
  `;

  overlayRoot = document.createElement("div");
  overlayRoot.className = "overlay-root";

  overlayEl = document.createElement("div");
  overlayEl.className = "search-overlay";
  overlayEl.innerHTML = `
    <div class="search-panel">
      <input type="text" id="search-input" placeholder="Search tabs..." />
      <div id="results-container"></div>
      <div id="loading" style="display:none">Loading...</div>
    </div>
    <div class="preview-panel">
      <div class="preview-title">Preview</div>
      <div class="preview-url"></div>
      <div class="preview-content">No tab selected</div>
    </div>
  `;

  overlayRoot.appendChild(overlayEl);
  shadow.append(style, overlayRoot);
  ensureAttached();

  // Cache important nodes
  inputEl = overlayEl.querySelector('#search-input');
  resultsEl = overlayEl.querySelector('#results-container');
  loadingEl = overlayEl.querySelector('#loading');
  previewTitleEl = overlayEl.querySelector('.preview-title');
  previewUrlEl = overlayEl.querySelector('.preview-url');
  previewContentEl = overlayEl.querySelector('.preview-content');

  return refs();
}

function refs() {
  return { host, shadow, overlayRoot, overlayEl, inputEl, resultsEl, loadingEl, previewTitleEl, previewUrlEl, previewContentEl };
}

// Expose just what the controller needs beyond refs
export function getInputElement() {
  if (!inited) ensureSearchDOM();
  return inputEl;
}

export function setOverlayVisible(visible) {
  if (!inited) ensureSearchDOM();
  if (overlayRoot) overlayRoot.style.display = visible ? 'flex' : 'none';
}

export function isOverlayVisible() {
  return !!overlayRoot && overlayRoot.style.display !== 'none';
}

export function focusSearchInput() {
  if (!inited) ensureSearchDOM();
  inputEl?.focus?.();
}

export function clearResults() {
  if (!inited) ensureSearchDOM();
  if (resultsEl) resultsEl.innerHTML = '';
}

export function appendResultItem(title, group, selected = false) {
  if (!inited) ensureSearchDOM();
  const item = document.createElement('div');
  item.className = 'result-item' + (selected ? ' selected' : '');
  item.innerHTML = `
    <div class="result-title"></div>
    <div class="result-group"></div>
  `;
  item.querySelector('.result-title').textContent = String(title ?? '');
  item.querySelector('.result-group').textContent = String(group ?? '');
  resultsEl?.appendChild(item);
  return item;
}

export function setSelectedIndex(idx) {
  if (!inited) ensureSearchDOM();
  const nodes = resultsEl?.querySelectorAll('.result-item');
  if (!nodes) return;
  nodes.forEach((n, i) => {
    if (i === idx) n.classList.add('selected'); else n.classList.remove('selected');
  });
}

export function setPreview(title, content) {
  if (!inited) ensureSearchDOM();
  if (previewTitleEl) previewTitleEl.textContent = String(title ?? '');
  if (previewContentEl) previewContentEl.textContent = String(content ?? '');
}

export function setPreviewDetails({ title, url, groupTitle, lastAccessed } = {}) {
  if (!inited) ensureSearchDOM();
  if (previewTitleEl) previewTitleEl.textContent = String(title ?? '');
  if (previewUrlEl) previewUrlEl.textContent = String(url ?? '');
  if (previewContentEl) {
    // Clear and rebuild with styled rows
    previewContentEl.innerHTML = '';
    const row = (label, value) => {
      const r = document.createElement('div');
      r.className = 'preview-meta-row';
      const l = document.createElement('span');
      l.className = 'preview-label';
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'preview-value';
      v.textContent = value;
      r.append(l, v);
      return r;
    };

    const groupText = groupTitle ? String(groupTitle) : '(No group)';
    previewContentEl.appendChild(row('Group:', groupText));

    let lastStr = '—';
    if (lastAccessed != null && isFinite(lastAccessed)) {
      try { lastStr = new Date(Number(lastAccessed)).toLocaleString(); } catch (_) { /* ignore */ }
    }
    previewContentEl.appendChild(row('Last accessed:', lastStr));
  }
}

export function setLoading(visible) {
  if (!inited) ensureSearchDOM();
  if (!loadingEl) return;
  loadingEl.style.display = visible ? 'block' : 'none';
}

export function cleanupSearchRender() {
  try { host?.remove(); } finally {
    inited = false;
    host = null; shadow = null;
    overlayRoot = null; overlayEl = null;
    inputEl = null; resultsEl = null; loadingEl = null; previewTitleEl = null; previewContentEl = null;
  }
}
