// Controller/logic for the lightweight search UI overlay.
// Uses rendering helpers from search_render; exports init/open/close/toggle and key handling.

import {
  ensureSearchDOM,
  setOverlayVisible,
  isOverlayVisible,
  focusSearchInput,
  clearResults,
  appendResultItem,
  setSelectedIndex,
  setPreview,
  setPreviewDetails,
  setLoading,
  cleanupSearchRender,
  getInputElement,
} from "./search_render.js";
import { Debouncer, BackgroundSearchClient, ResultsModel } from "./search_core.js";

let inited = false;
let listenersAttached = false;
let inputListenerAttached = false;
const debouncer = new Debouncer(120);
const client = new BackgroundSearchClient();
const model = new ResultsModel();
let lastQueryToken = 0;

export function initSearchUI() {
  if (inited) return;
  inited = true;
  ensureSearchDOM();
  attachListeners();
}

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  // Handle keyboard only when overlay is visible; capture is false to respect other handlers when closed.
  document.addEventListener("keydown", onKeydown, { capture: false });
}

function detachListeners() {
  if (!listenersAttached) return;
  listenersAttached = false;
  document.removeEventListener("keydown", onKeydown, { capture: false });
}

// Public keydown handler (optional external use)
export function handleSearchKeydown(e) { onKeydown(e); }

function onKeydown(e) {
  if (!isOverlayVisible()) return;
  const k = String(e.key);
  // Prevent Vim or page handlers when open for common nav keys
  if (["Escape", "ArrowUp", "ArrowDown", "Enter", "Tab"].includes(k)) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (k === "Escape") {
    closeSearchPanel();
    return;
  }
  if (k === "ArrowDown") {
    moveSelection(1);
    return;
  }
  if (k === "ArrowUp") {
    moveSelection(-1);
    return;
  }
  if (k === "Enter") {
    activateSelection();
    return;
  }
  if (k === "Tab") {
    moveSelection(e.shiftKey ? -1 : 1);
    return;
  }
}

function moveSelection(delta) {
  const it = model.move(delta);
  if (!it) return;
  setSelectedIndex(model.selectedIdx);
  setPreviewDetails({
    title: it.title,
    url: it.url || '',
    groupTitle: it.groupTitle || it.group || '',
    lastAccessed: it.lastAccessed,
  });
}

function activateSelection() {
  const it = model.current();
  if (it && typeof it.id === 'number') {
    try {
      client.activateTab(it.id);
    } catch (_) {}
  }
  closeSearchPanel();
}

export function openSearchPanel() {
  initSearchUI();
  setOverlayVisible(true);
  globalThis.__wer_search_open = true;
  ensureInputListener();
  // Trigger initial search with current value (possibly empty)
  queryAndRender();
  focusSearchInput();
}

export function closeSearchPanel() {
  initSearchUI();
  setOverlayVisible(false);
  globalThis.__wer_search_open = false;
}

export function toggleSearchPanel() {
  initSearchUI();
  const willOpen = !isOverlayVisible();
  setOverlayVisible(willOpen);
  globalThis.__wer_search_open = willOpen;
  if (willOpen) {
    ensureInputListener();
    queryAndRender();
    focusSearchInput();
  }
}

export function cleanupSearchUI() {
  try { detachListeners(); cleanupSearchRender(); }
  finally { inited = false; }
}

export function isSearchOpen() {
  return !!globalThis.__wer_search_open;
}

function renderItems() {
  clearResults();
  if (!model.size()) {
    setPreview("Preview", "No tab selected");
    model.selectedIdx = -1;
    return;
  }
  model.items.forEach((it, i) => appendResultItem(it.title, it.groupTitle || it.group || '', i === model.selectedIdx));
  if (model.selectedIdx < 0) {
    model.selectedIdx = 0;
    setSelectedIndex(model.selectedIdx);
  }
  const it = model.current();
  setPreviewDetails({
    title: it.title,
    url: it.url || '',
    groupTitle: it.groupTitle || it.group || '',
    lastAccessed: it.lastAccessed,
  });
}

function ensureInputListener() {
  if (inputListenerAttached) return;
  const input = getInputElement();
  if (!input) return;
  inputListenerAttached = true;
  input.addEventListener('input', () => {
    debouncer.run(() => { queryAndRender(); });
  });
}

function queryAndRender() {
  const input = getInputElement();
  const q = input?.value || '';
  setLoading(true);
  const token = ++lastQueryToken;
  client.search(q).then((results) => {
    if (token !== lastQueryToken) return; // stale response
    const mapped = results.map((t) => ({
      id: typeof t?.id === 'number' ? t.id : (typeof t?.id === 'string' ? Number(t.id) : undefined),
      title: t?.title || '',
      groupTitle: t?.group_title || '',
      group: t?.group_title || '',
      url: t?.url || '',
      lastAccessed: typeof t?.last_accessed === 'number' ? t.last_accessed : undefined,
    }));

    const changed = model.setItems(mapped);
    if (changed) {
      renderItems();
    } else {
      // Just update selection/preview to reflect any index clamping
      const it = model.current();
      if (it) {
        setSelectedIndex(model.selectedIdx);
        setPreviewDetails({ title: it.title, url: it.url || '', groupTitle: it.groupTitle || it.group || '', lastAccessed: it.lastAccessed });
      } else {
        setPreview('Preview', 'No tab selected');
      }
    }
    setLoading(false);
  }).catch(() => {
    if (token !== lastQueryToken) return;
    model.setItems([]);
    renderItems();
    setLoading(false);
  });
}
