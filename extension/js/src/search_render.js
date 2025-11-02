// Rendering-only module for the search overlay based on search.html/search.css
// Exposes DOM lifecycle and view updates; no business logic here.

let inited = false;
let host = null;        // fixed host attached to DOM (full-viewport container)
let shadow = null;      // ShadowRoot
let overlayRoot = null; // centers the overlay box; hidden by default
let overlayEl = null;   // .search-overlay (loaded from external HTML)
let inputEl = null;     // #search-input
let resultsEl = null;   // #results-container
let loadingEl = null;   // #loading
let previewTitleEl = null;  // .preview-title
let previewUrlEl = null;    // .preview-url
let previewContentEl = null; // .preview-content

// Global template cache (loaded once, reused forever)
let templatePromise = null;

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

async function loadTemplate() {
  if (templatePromise) return templatePromise;
  templatePromise = (async () => {
    const htmlUrl = (globalThis.chrome && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('js/search.html')
      : '/js/search.html';
    try {
      const resp = await fetch(htmlUrl);
      if (!resp.ok) throw new Error('Template fetch failed');
      const htmlText = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const overlayNode = doc.querySelector('.search-overlay');
      if (!overlayNode) throw new Error('No .search-overlay in template');
      return overlayNode.cloneNode(true);
    } catch (err) {
      console.warn('Failed to load search template, using fallback:', err);
      const fallback = document.createElement('div');
      fallback.className = 'search-overlay';
      fallback.innerHTML = '<div class="search-panel"><input id="search-input" placeholder="Search tabs..." /><div id="results-container"></div><div id="loading" style="display:none">Loading...</div></div><div class="preview-panel"><div class="preview-title">Preview</div><div class="preview-url"></div><div class="preview-content">No tab selected</div></div>';
      return fallback;
    }
  })();
  return templatePromise;
}

export async function ensureSearchDOM() {
  if (inited) return refs();
  inited = true;

  host = document.createElement("div");
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";

  shadow = host.attachShadow({ mode: "open" });

  // Attach external stylesheet into shadow for isolated styling
  const cssLink = document.createElement('link');
  cssLink.setAttribute('rel', 'stylesheet');
  const cssUrl = (globalThis.chrome && chrome.runtime && chrome.runtime.getURL)
    ? chrome.runtime.getURL('js/search.css')
    : '/js/search.css';
  cssLink.setAttribute('href', cssUrl);

  overlayRoot = document.createElement('div');
  overlayRoot.className = 'overlay-root';

  shadow.append(cssLink, overlayRoot);
  ensureAttached();

  // Load template asynchronously (cached after first load)
  const templateNode = await loadTemplate();
  overlayEl = templateNode.cloneNode(true);
  overlayRoot.appendChild(overlayEl);

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
