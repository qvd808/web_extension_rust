// extension/js/src/search_render.js
var inited = false;
var host = null;
var shadow = null;
var overlayRoot = null;
var overlayEl = null;
var inputEl = null;
var resultsEl = null;
var loadingEl = null;
var previewTitleEl = null;
var previewUrlEl = null;
var previewContentEl = null;
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
function ensureSearchDOM() {
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
      content: "\u25B6";
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
  inputEl = overlayEl.querySelector("#search-input");
  resultsEl = overlayEl.querySelector("#results-container");
  loadingEl = overlayEl.querySelector("#loading");
  previewTitleEl = overlayEl.querySelector(".preview-title");
  previewUrlEl = overlayEl.querySelector(".preview-url");
  previewContentEl = overlayEl.querySelector(".preview-content");
  return refs();
}
function refs() {
  return { host, shadow, overlayRoot, overlayEl, inputEl, resultsEl, loadingEl, previewTitleEl, previewUrlEl, previewContentEl };
}
function getInputElement() {
  if (!inited) ensureSearchDOM();
  return inputEl;
}
function setOverlayVisible(visible) {
  if (!inited) ensureSearchDOM();
  if (overlayRoot) overlayRoot.style.display = visible ? "flex" : "none";
}
function isOverlayVisible() {
  return !!overlayRoot && overlayRoot.style.display !== "none";
}
function focusSearchInput() {
  if (!inited) ensureSearchDOM();
  inputEl?.focus?.();
}
function clearResults() {
  if (!inited) ensureSearchDOM();
  if (resultsEl) resultsEl.innerHTML = "";
}
function appendResultItem(title, group, selected = false) {
  if (!inited) ensureSearchDOM();
  const item = document.createElement("div");
  item.className = "result-item" + (selected ? " selected" : "");
  item.innerHTML = `
    <div class="result-title"></div>
    <div class="result-group"></div>
  `;
  item.querySelector(".result-title").textContent = String(title ?? "");
  item.querySelector(".result-group").textContent = String(group ?? "");
  resultsEl?.appendChild(item);
  return item;
}
function setSelectedIndex(idx) {
  if (!inited) ensureSearchDOM();
  const nodes = resultsEl?.querySelectorAll(".result-item");
  if (!nodes) return;
  nodes.forEach((n, i) => {
    if (i === idx) n.classList.add("selected");
    else n.classList.remove("selected");
  });
}
function setPreview(title, content) {
  if (!inited) ensureSearchDOM();
  if (previewTitleEl) previewTitleEl.textContent = String(title ?? "");
  if (previewContentEl) previewContentEl.textContent = String(content ?? "");
}
function setPreviewDetails({ title, url, groupTitle, lastAccessed } = {}) {
  if (!inited) ensureSearchDOM();
  if (previewTitleEl) previewTitleEl.textContent = String(title ?? "");
  if (previewUrlEl) previewUrlEl.textContent = String(url ?? "");
  if (previewContentEl) {
    previewContentEl.innerHTML = "";
    const row = (label, value) => {
      const r = document.createElement("div");
      r.className = "preview-meta-row";
      const l = document.createElement("span");
      l.className = "preview-label";
      l.textContent = label;
      const v = document.createElement("span");
      v.className = "preview-value";
      v.textContent = value;
      r.append(l, v);
      return r;
    };
    const groupText = groupTitle ? String(groupTitle) : "(No group)";
    previewContentEl.appendChild(row("Group:", groupText));
    let lastStr = "\u2014";
    if (lastAccessed != null && isFinite(lastAccessed)) {
      try {
        lastStr = new Date(Number(lastAccessed)).toLocaleString();
      } catch (_) {
      }
    }
    previewContentEl.appendChild(row("Last accessed:", lastStr));
  }
}
function setLoading(visible) {
  if (!inited) ensureSearchDOM();
  if (!loadingEl) return;
  loadingEl.style.display = visible ? "block" : "none";
}
function cleanupSearchRender() {
  try {
    host?.remove();
  } finally {
    inited = false;
    host = null;
    shadow = null;
    overlayRoot = null;
    overlayEl = null;
    inputEl = null;
    resultsEl = null;
    loadingEl = null;
    previewTitleEl = null;
    previewContentEl = null;
  }
}

// extension/js/src/search_core.js
var Debouncer = class {
  constructor(delay = 120) {
    this.delay = delay;
    this.id = null;
  }
  run(fn) {
    if (this.id) clearTimeout(this.id);
    this.id = setTimeout(() => {
      this.id = null;
      try {
        fn();
      } catch (_) {
      }
    }, this.delay);
  }
  flush(fn) {
    if (this.id) {
      clearTimeout(this.id);
      this.id = null;
    }
    try {
      fn();
    } catch (_) {
    }
  }
};
var BackgroundSearchClient = class {
  search(query) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "fuzzySearch", query: String(query || "") }, (resp) => {
          if (!resp || resp.ok !== true) return resolve([]);
          resolve(Array.isArray(resp.results) ? resp.results : []);
        });
      } catch (_) {
        resolve([]);
      }
    });
  }
  activateTab(tabId) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: "activateTab", tabId }, () => resolve());
      } catch (_) {
        resolve();
      }
    });
  }
};
var ResultsModel = class {
  constructor() {
    this.items = [];
    this.selectedIdx = -1;
  }
  size() {
    return this.items.length;
  }
  keyOf(it) {
    const id = (it && (typeof it.id === "number" ? it.id : it.id || "")) + "";
    const url = it && it.url || "";
    const title = it && it.title || "";
    return `${id}|${url}|${title}`;
  }
  equals(list) {
    if (!Array.isArray(list)) return false;
    if (list.length !== this.items.length) return false;
    for (let i = 0; i < list.length; i++) {
      if (this.keyOf(list[i]) !== this.keyOf(this.items[i])) return false;
    }
    return true;
  }
  setItems(list) {
    if (this.equals(list)) return false;
    this.items = Array.isArray(list) ? list : [];
    if (this.items.length === 0) {
      this.selectedIdx = -1;
    } else {
      if (this.selectedIdx < 0) this.selectedIdx = 0;
      if (this.selectedIdx >= this.items.length) this.selectedIdx = this.items.length - 1;
    }
    return true;
  }
  move(delta) {
    if (!this.items.length) return null;
    const n = this.items.length;
    this.selectedIdx = (this.selectedIdx + delta + n) % n;
    return this.current();
  }
  current() {
    if (this.selectedIdx < 0 || this.selectedIdx >= this.items.length) return null;
    return this.items[this.selectedIdx];
  }
};

// extension/js/src/search_ui.js
var inited2 = false;
var listenersAttached = false;
var inputListenerAttached = false;
var debouncer = new Debouncer(120);
var client = new BackgroundSearchClient();
var model = new ResultsModel();
var lastQueryToken = 0;
function initSearchUI() {
  if (inited2) return;
  inited2 = true;
  ensureSearchDOM();
  attachListeners();
}
function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  document.addEventListener("keydown", onKeydown, { capture: false });
}
function detachListeners() {
  if (!listenersAttached) return;
  listenersAttached = false;
  document.removeEventListener("keydown", onKeydown, { capture: false });
}
function handleSearchKeydown(e) {
  onKeydown(e);
}
function onKeydown(e) {
  if (!isOverlayVisible()) return;
  const k = String(e.key);
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
    url: it.url || "",
    groupTitle: it.groupTitle || it.group || "",
    lastAccessed: it.lastAccessed
  });
}
function activateSelection() {
  const it = model.current();
  if (it && typeof it.id === "number") {
    try {
      client.activateTab(it.id);
    } catch (_) {
    }
  }
  closeSearchPanel();
}
function openSearchPanel() {
  initSearchUI();
  setOverlayVisible(true);
  globalThis.__wer_search_open = true;
  ensureInputListener();
  queryAndRender();
  focusSearchInput();
}
function closeSearchPanel() {
  initSearchUI();
  setOverlayVisible(false);
  globalThis.__wer_search_open = false;
}
function toggleSearchPanel() {
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
function cleanupSearchUI() {
  try {
    detachListeners();
    cleanupSearchRender();
  } finally {
    inited2 = false;
  }
}
function isSearchOpen() {
  return !!globalThis.__wer_search_open;
}
function renderItems() {
  clearResults();
  if (!model.size()) {
    setPreview("Preview", "No tab selected");
    model.selectedIdx = -1;
    return;
  }
  model.items.forEach((it2, i) => appendResultItem(it2.title, it2.groupTitle || it2.group || "", i === model.selectedIdx));
  if (model.selectedIdx < 0) {
    model.selectedIdx = 0;
    setSelectedIndex(model.selectedIdx);
  }
  const it = model.current();
  setPreviewDetails({
    title: it.title,
    url: it.url || "",
    groupTitle: it.groupTitle || it.group || "",
    lastAccessed: it.lastAccessed
  });
}
function ensureInputListener() {
  if (inputListenerAttached) return;
  const input = getInputElement();
  if (!input) return;
  inputListenerAttached = true;
  input.addEventListener("input", () => {
    debouncer.run(() => {
      queryAndRender();
    });
  });
}
function queryAndRender() {
  const input = getInputElement();
  const q = input?.value || "";
  setLoading(true);
  const token = ++lastQueryToken;
  client.search(q).then((results) => {
    if (token !== lastQueryToken) return;
    const mapped = results.map((t) => ({
      id: typeof t?.id === "number" ? t.id : typeof t?.id === "string" ? Number(t.id) : void 0,
      title: t?.title || "",
      groupTitle: t?.group_title || "",
      group: t?.group_title || "",
      url: t?.url || "",
      lastAccessed: typeof t?.last_accessed === "number" ? t.last_accessed : void 0
    }));
    const changed = model.setItems(mapped);
    if (changed) {
      renderItems();
    } else {
      const it = model.current();
      if (it) {
        setSelectedIndex(model.selectedIdx);
        setPreviewDetails({ title: it.title, url: it.url || "", groupTitle: it.groupTitle || it.group || "", lastAccessed: it.lastAccessed });
      } else {
        setPreview("Preview", "No tab selected");
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
export {
  cleanupSearchUI,
  closeSearchPanel,
  handleSearchKeydown,
  initSearchUI,
  isSearchOpen,
  openSearchPanel,
  toggleSearchPanel
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NlYXJjaF9yZW5kZXIuanMiLCAiLi4vc3JjL3NlYXJjaF9jb3JlLmpzIiwgIi4uL3NyYy9zZWFyY2hfdWkuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8vIFJlbmRlcmluZy1vbmx5IG1vZHVsZSBmb3IgdGhlIHNlYXJjaCBvdmVybGF5IGJhc2VkIG9uIHNlYXJjaC5odG1sL3NlYXJjaC5jc3Ncbi8vIEV4cG9zZXMgRE9NIGxpZmVjeWNsZSBhbmQgdmlldyB1cGRhdGVzOyBubyBidXNpbmVzcyBsb2dpYyBoZXJlLlxuXG5sZXQgaW5pdGVkID0gZmFsc2U7XG5sZXQgaG9zdCA9IG51bGw7ICAgICAgICAvLyBmaXhlZCBob3N0IGF0dGFjaGVkIHRvIERPTSAoZnVsbC12aWV3cG9ydCBjb250YWluZXIpXG5sZXQgc2hhZG93ID0gbnVsbDsgICAgICAvLyBTaGFkb3dSb290XG5sZXQgb3ZlcmxheVJvb3QgPSBudWxsOyAvLyBjZW50ZXJzIHRoZSBvdmVybGF5IGJveDsgaGlkZGVuIGJ5IGRlZmF1bHRcbmxldCBvdmVybGF5RWwgPSBudWxsOyAgIC8vIC5zZWFyY2gtb3ZlcmxheSAoOTAweDUwMCBwYW5lbClcbmxldCBpbnB1dEVsID0gbnVsbDsgICAgIC8vICNzZWFyY2gtaW5wdXRcbmxldCByZXN1bHRzRWwgPSBudWxsOyAgIC8vICNyZXN1bHRzLWNvbnRhaW5lclxubGV0IGxvYWRpbmdFbCA9IG51bGw7ICAgLy8gI2xvYWRpbmdcbmxldCBwcmV2aWV3VGl0bGVFbCA9IG51bGw7ICAvLyAucHJldmlldy10aXRsZVxubGV0IHByZXZpZXdVcmxFbCA9IG51bGw7ICAgIC8vIC5wcmV2aWV3LXVybFxubGV0IHByZXZpZXdDb250ZW50RWwgPSBudWxsOyAvLyAucHJldmlldy1jb250ZW50XG5cbmZ1bmN0aW9uIGVuc3VyZUF0dGFjaGVkKCkge1xuICBpZiAoIWhvc3QpIHJldHVybjtcbiAgY29uc3QgYXR0YWNoID0gKCkgPT4ge1xuICAgIGlmICghZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNvbnRhaW5zKGhvc3QpKSB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoaG9zdCk7XG4gICAgfVxuICB9O1xuICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJsb2FkaW5nXCIpIHtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBhdHRhY2gsIHsgb25jZTogdHJ1ZSB9KTtcbiAgfSBlbHNlIHtcbiAgICBhdHRhY2goKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlU2VhcmNoRE9NKCkge1xuICBpZiAoaW5pdGVkKSByZXR1cm4gcmVmcygpO1xuICBpbml0ZWQgPSB0cnVlO1xuXG4gIGhvc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBob3N0LnN0eWxlLmFsbCA9IFwiaW5pdGlhbFwiO1xuICBob3N0LnN0eWxlLnBvc2l0aW9uID0gXCJmaXhlZFwiO1xuICBob3N0LnN0eWxlLmluc2V0ID0gXCIwXCI7XG4gIGhvc3Quc3R5bGUuekluZGV4ID0gXCIyMTQ3NDgzNjQ3XCI7XG5cbiAgc2hhZG93ID0gaG9zdC5hdHRhY2hTaGFkb3coeyBtb2RlOiBcIm9wZW5cIiB9KTtcblxuICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgc3R5bGUudGV4dENvbnRlbnQgPSBgXG4gICAgOmhvc3QgeyBhbGw6IGluaXRpYWw7IH1cbiAgICAub3ZlcmxheS1yb290IHtcbiAgICAgIHBvc2l0aW9uOiBmaXhlZDsgaW5zZXQ6IDA7XG4gICAgICBkaXNwbGF5OiBub25lOyAvKiB0b2dnbGVkIHRvIGZsZXggd2hlbiB2aXNpYmxlICovXG4gICAgICBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcbiAgICAgIGJhY2tncm91bmQ6IHJnYmEoMCwwLDAsMC4zNSk7XG4gICAgICBiYWNrZHJvcC1maWx0ZXI6IGJsdXIoMnB4KTtcbiAgICAgIGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsIFwiU2Vnb2UgVUlcIiwgXCJSb2JvdG9cIiwgXCJPeHlnZW5cIiwgXCJVYnVudHVcIiwgXCJDYW50YXJlbGxcIiwgc2Fucy1zZXJpZjtcbiAgICB9XG5cbiAgICAuc2VhcmNoLW92ZXJsYXkge1xuICAgICAgd2lkdGg6IDkwMHB4O1xuICAgICAgaGVpZ2h0OiA1MDBweDtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6ICMxYTFhMWE7XG4gICAgICBib3JkZXI6IDFweCBzb2xpZCAjMzMzO1xuICAgICAgYm9yZGVyLXJhZGl1czogOHB4O1xuICAgICAgYm94LXNoYWRvdzogMCA4cHggMzJweCByZ2JhKDAsIDAsIDAsIDAuNik7XG4gICAgICBkaXNwbGF5OiBmbGV4O1xuICAgICAgZmxleC1kaXJlY3Rpb246IHJvdztcbiAgICAgIG92ZXJmbG93OiBoaWRkZW47XG4gICAgICBhbmltYXRpb246IHNsaWRlSW4gMC4ycyBlYXNlLW91dDtcbiAgICAgIGNvbG9yOiAjZTBlMGUwO1xuICAgIH1cblxuICAgIEBrZXlmcmFtZXMgc2xpZGVJbiB7XG4gICAgICBmcm9tIHsgb3BhY2l0eTogMDsgdHJhbnNmb3JtOiBzY2FsZSgwLjk1KTsgfVxuICAgICAgdG8geyBvcGFjaXR5OiAxOyB0cmFuc2Zvcm06IHNjYWxlKDEpOyB9XG4gICAgfVxuXG4gICAgLnNlYXJjaC1wYW5lbCB7XG4gICAgICB3aWR0aDogNDUlO1xuICAgICAgZGlzcGxheTogZmxleDtcbiAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMjQyNDI0O1xuICAgICAgYm9yZGVyLXJpZ2h0OiAxcHggc29saWQgIzMzMztcbiAgICB9XG5cbiAgICAjc2VhcmNoLWlucHV0IHtcbiAgICAgIHdpZHRoOiAxMDAlO1xuICAgICAgcGFkZGluZzogMTZweCAyMHB4O1xuICAgICAgZm9udC1zaXplOiAxNXB4O1xuICAgICAgYm9yZGVyOiBub25lO1xuICAgICAgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICMzMzM7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMWExYTFhO1xuICAgICAgY29sb3I6ICNlMGUwZTA7XG4gICAgICBvdXRsaW5lOiBub25lO1xuICAgICAgdHJhbnNpdGlvbjogYm9yZGVyLWNvbG9yIDAuMnM7XG4gICAgfVxuICAgICNzZWFyY2gtaW5wdXQ6OnBsYWNlaG9sZGVyIHsgY29sb3I6ICM2NjY7IH1cbiAgICAjc2VhcmNoLWlucHV0OmZvY3VzIHsgYm9yZGVyLWJvdHRvbS1jb2xvcjogIzRhOWVmZjsgYmFja2dyb3VuZC1jb2xvcjogIzFlMWUxZTsgfVxuXG4gICAgI3Jlc3VsdHMtY29udGFpbmVyIHtcbiAgICAgIGZsZXg6IDE7XG4gICAgICBvdmVyZmxvdy15OiBhdXRvO1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzI0MjQyNDtcbiAgICAgIHBhZGRpbmc6IDA7XG4gICAgfVxuXG4gICAgLnJlc3VsdC1pdGVtIHtcbiAgICAgIHBhZGRpbmc6IDEycHggMjBweDtcbiAgICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICAgIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMmEyYTJhO1xuICAgICAgdHJhbnNpdGlvbjogYWxsIDAuMTVzIGVhc2U7XG4gICAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgfVxuICAgIC5yZXN1bHQtaXRlbTpob3ZlciB7IGJhY2tncm91bmQtY29sb3I6ICMyZDJkMmQ7IH1cbiAgICAucmVzdWx0LWl0ZW0uc2VsZWN0ZWQge1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzJhNGE2YTtcbiAgICAgIGJvcmRlci1sZWZ0OiAzcHggc29saWQgIzRhOWVmZjtcbiAgICAgIHBhZGRpbmctbGVmdDogMTdweDtcbiAgICB9XG4gICAgLnJlc3VsdC1pdGVtLnNlbGVjdGVkOjpiZWZvcmUge1xuICAgICAgY29udGVudDogXCJcdTI1QjZcIjtcbiAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTsgcmlnaHQ6IDE2cHg7XG4gICAgICBjb2xvcjogIzRhOWVmZjsgZm9udC1zaXplOiAxMHB4O1xuICAgIH1cbiAgICAucmVzdWx0LXRpdGxlIHtcbiAgICAgIGZvbnQtc2l6ZTogMTRweDsgY29sb3I6ICNlMGUwZTA7IG1hcmdpbi1ib3R0b206IDRweDsgZm9udC13ZWlnaHQ6IDUwMDtcbiAgICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7IG92ZXJmbG93OiBoaWRkZW47IHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzO1xuICAgIH1cbiAgICAucmVzdWx0LWdyb3VwIHsgZm9udC1zaXplOiAxMXB4OyBjb2xvcjogIzg4ODsgfVxuICAgIC5yZXN1bHQtaXRlbS5zZWxlY3RlZCAucmVzdWx0LXRpdGxlIHsgY29sb3I6ICNmZmY7IH1cbiAgICAucmVzdWx0LWl0ZW0uc2VsZWN0ZWQgLnJlc3VsdC1ncm91cCB7IGNvbG9yOiAjYWFhOyB9XG4gICAgLm5vLXJlc3VsdHMgeyBwYWRkaW5nOiA0MHB4IDIwcHg7IHRleHQtYWxpZ246IGNlbnRlcjsgY29sb3I6ICM2NjY7IGZvbnQtc2l6ZTogMTNweDsgfVxuXG4gICAgLnByZXZpZXctcGFuZWwge1xuICAgICAgd2lkdGg6IDU1JTtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6ICMxYTFhMWE7XG4gICAgICBwYWRkaW5nOiAyNHB4O1xuICAgICAgb3ZlcmZsb3cteTogYXV0bztcbiAgICAgIGZvbnQtc2l6ZTogMTNweDtcbiAgICAgIGxpbmUtaGVpZ2h0OiAxLjY7XG4gICAgICBjb2xvcjogI2Q0ZDRkNDtcbiAgICB9XG4gICAgLnByZXZpZXctcGFuZWwgLnByZXZpZXctdGl0bGUge1xuICAgICAgZm9udC1zaXplOiAxOHB4OyBmb250LXdlaWdodDogNjAwOyBjb2xvcjogI2ZmZmZmZjsgbWFyZ2luLWJvdHRvbTogMTJweDtcbiAgICAgIHBhZGRpbmctYm90dG9tOiAxMnB4OyBib3JkZXItYm90dG9tOiAycHggc29saWQgIzMzMzsgd2hpdGUtc3BhY2U6IG5vd3JhcDtcbiAgICAgIG92ZXJmbG93OiBoaWRkZW47IHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzO1xuICAgIH1cbiAgLnByZXZpZXctcGFuZWwgLnByZXZpZXctY29udGVudCB7IGNvbG9yOiAjYWFhOyBmb250LXNpemU6IDEzcHg7IGxpbmUtaGVpZ2h0OiAxLjg7IHdoaXRlLXNwYWNlOiBwcmUtd3JhcDsgfVxuICAucHJldmlldy1wYW5lbCAucHJldmlldy11cmwgeyBjb2xvcjogIzRhOWVmZjsgZm9udC1zaXplOiAxMnB4OyBtYXJnaW4tYm90dG9tOiAyMHB4OyB3b3JkLWJyZWFrOiBicmVhay1hbGw7IGxpbmUtaGVpZ2h0OiAxLjU7IH1cbiAgLnByZXZpZXctcGFuZWwgLnByZXZpZXctbWV0YS1yb3cgeyBtYXJnaW46IDRweCAwOyB9XG4gIC5wcmV2aWV3LXBhbmVsIC5wcmV2aWV3LWxhYmVsIHsgZm9udC13ZWlnaHQ6IDYwMDsgY29sb3I6ICNkZGQ7IG1hcmdpbi1yaWdodDogNnB4OyB9XG4gIC5wcmV2aWV3LXBhbmVsIC5wcmV2aWV3LXZhbHVlIHsgY29sb3I6ICNiYmI7IH1cbiAgICAjbG9hZGluZyB7IHRleHQtYWxpZ246IGNlbnRlcjsgY29sb3I6ICM4NTg1ODU7IHBhZGRpbmc6IDIwcHg7IGZvbnQtc2l6ZTogMTNweDsgfVxuXG4gICAgOjotd2Via2l0LXNjcm9sbGJhciB7IHdpZHRoOiA4cHg7IH1cbiAgICA6Oi13ZWJraXQtc2Nyb2xsYmFyLXRyYWNrIHsgYmFja2dyb3VuZDogIzFhMWExYTsgfVxuICAgIDo6LXdlYmtpdC1zY3JvbGxiYXItdGh1bWIgeyBiYWNrZ3JvdW5kOiAjNDQ0OyBib3JkZXItcmFkaXVzOiA0cHg7IH1cbiAgICA6Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iOmhvdmVyIHsgYmFja2dyb3VuZDogIzU1NTsgfVxuICBgO1xuXG4gIG92ZXJsYXlSb290ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgb3ZlcmxheVJvb3QuY2xhc3NOYW1lID0gXCJvdmVybGF5LXJvb3RcIjtcblxuICBvdmVybGF5RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBvdmVybGF5RWwuY2xhc3NOYW1lID0gXCJzZWFyY2gtb3ZlcmxheVwiO1xuICBvdmVybGF5RWwuaW5uZXJIVE1MID0gYFxuICAgIDxkaXYgY2xhc3M9XCJzZWFyY2gtcGFuZWxcIj5cbiAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGlkPVwic2VhcmNoLWlucHV0XCIgcGxhY2Vob2xkZXI9XCJTZWFyY2ggdGFicy4uLlwiIC8+XG4gICAgICA8ZGl2IGlkPVwicmVzdWx0cy1jb250YWluZXJcIj48L2Rpdj5cbiAgICAgIDxkaXYgaWQ9XCJsb2FkaW5nXCIgc3R5bGU9XCJkaXNwbGF5Om5vbmVcIj5Mb2FkaW5nLi4uPC9kaXY+XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cInByZXZpZXctcGFuZWxcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJwcmV2aWV3LXRpdGxlXCI+UHJldmlldzwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cInByZXZpZXctdXJsXCI+PC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwicHJldmlldy1jb250ZW50XCI+Tm8gdGFiIHNlbGVjdGVkPC9kaXY+XG4gICAgPC9kaXY+XG4gIGA7XG5cbiAgb3ZlcmxheVJvb3QuYXBwZW5kQ2hpbGQob3ZlcmxheUVsKTtcbiAgc2hhZG93LmFwcGVuZChzdHlsZSwgb3ZlcmxheVJvb3QpO1xuICBlbnN1cmVBdHRhY2hlZCgpO1xuXG4gIC8vIENhY2hlIGltcG9ydGFudCBub2Rlc1xuICBpbnB1dEVsID0gb3ZlcmxheUVsLnF1ZXJ5U2VsZWN0b3IoJyNzZWFyY2gtaW5wdXQnKTtcbiAgcmVzdWx0c0VsID0gb3ZlcmxheUVsLnF1ZXJ5U2VsZWN0b3IoJyNyZXN1bHRzLWNvbnRhaW5lcicpO1xuICBsb2FkaW5nRWwgPSBvdmVybGF5RWwucXVlcnlTZWxlY3RvcignI2xvYWRpbmcnKTtcbiAgcHJldmlld1RpdGxlRWwgPSBvdmVybGF5RWwucXVlcnlTZWxlY3RvcignLnByZXZpZXctdGl0bGUnKTtcbiAgcHJldmlld1VybEVsID0gb3ZlcmxheUVsLnF1ZXJ5U2VsZWN0b3IoJy5wcmV2aWV3LXVybCcpO1xuICBwcmV2aWV3Q29udGVudEVsID0gb3ZlcmxheUVsLnF1ZXJ5U2VsZWN0b3IoJy5wcmV2aWV3LWNvbnRlbnQnKTtcblxuICByZXR1cm4gcmVmcygpO1xufVxuXG5mdW5jdGlvbiByZWZzKCkge1xuICByZXR1cm4geyBob3N0LCBzaGFkb3csIG92ZXJsYXlSb290LCBvdmVybGF5RWwsIGlucHV0RWwsIHJlc3VsdHNFbCwgbG9hZGluZ0VsLCBwcmV2aWV3VGl0bGVFbCwgcHJldmlld1VybEVsLCBwcmV2aWV3Q29udGVudEVsIH07XG59XG5cbi8vIEV4cG9zZSBqdXN0IHdoYXQgdGhlIGNvbnRyb2xsZXIgbmVlZHMgYmV5b25kIHJlZnNcbmV4cG9ydCBmdW5jdGlvbiBnZXRJbnB1dEVsZW1lbnQoKSB7XG4gIGlmICghaW5pdGVkKSBlbnN1cmVTZWFyY2hET00oKTtcbiAgcmV0dXJuIGlucHV0RWw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRPdmVybGF5VmlzaWJsZSh2aXNpYmxlKSB7XG4gIGlmICghaW5pdGVkKSBlbnN1cmVTZWFyY2hET00oKTtcbiAgaWYgKG92ZXJsYXlSb290KSBvdmVybGF5Um9vdC5zdHlsZS5kaXNwbGF5ID0gdmlzaWJsZSA/ICdmbGV4JyA6ICdub25lJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzT3ZlcmxheVZpc2libGUoKSB7XG4gIHJldHVybiAhIW92ZXJsYXlSb290ICYmIG92ZXJsYXlSb290LnN0eWxlLmRpc3BsYXkgIT09ICdub25lJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvY3VzU2VhcmNoSW5wdXQoKSB7XG4gIGlmICghaW5pdGVkKSBlbnN1cmVTZWFyY2hET00oKTtcbiAgaW5wdXRFbD8uZm9jdXM/LigpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJSZXN1bHRzKCkge1xuICBpZiAoIWluaXRlZCkgZW5zdXJlU2VhcmNoRE9NKCk7XG4gIGlmIChyZXN1bHRzRWwpIHJlc3VsdHNFbC5pbm5lckhUTUwgPSAnJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZFJlc3VsdEl0ZW0odGl0bGUsIGdyb3VwLCBzZWxlY3RlZCA9IGZhbHNlKSB7XG4gIGlmICghaW5pdGVkKSBlbnN1cmVTZWFyY2hET00oKTtcbiAgY29uc3QgaXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBpdGVtLmNsYXNzTmFtZSA9ICdyZXN1bHQtaXRlbScgKyAoc2VsZWN0ZWQgPyAnIHNlbGVjdGVkJyA6ICcnKTtcbiAgaXRlbS5pbm5lckhUTUwgPSBgXG4gICAgPGRpdiBjbGFzcz1cInJlc3VsdC10aXRsZVwiPjwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJyZXN1bHQtZ3JvdXBcIj48L2Rpdj5cbiAgYDtcbiAgaXRlbS5xdWVyeVNlbGVjdG9yKCcucmVzdWx0LXRpdGxlJykudGV4dENvbnRlbnQgPSBTdHJpbmcodGl0bGUgPz8gJycpO1xuICBpdGVtLnF1ZXJ5U2VsZWN0b3IoJy5yZXN1bHQtZ3JvdXAnKS50ZXh0Q29udGVudCA9IFN0cmluZyhncm91cCA/PyAnJyk7XG4gIHJlc3VsdHNFbD8uYXBwZW5kQ2hpbGQoaXRlbSk7XG4gIHJldHVybiBpdGVtO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0U2VsZWN0ZWRJbmRleChpZHgpIHtcbiAgaWYgKCFpbml0ZWQpIGVuc3VyZVNlYXJjaERPTSgpO1xuICBjb25zdCBub2RlcyA9IHJlc3VsdHNFbD8ucXVlcnlTZWxlY3RvckFsbCgnLnJlc3VsdC1pdGVtJyk7XG4gIGlmICghbm9kZXMpIHJldHVybjtcbiAgbm9kZXMuZm9yRWFjaCgobiwgaSkgPT4ge1xuICAgIGlmIChpID09PSBpZHgpIG4uY2xhc3NMaXN0LmFkZCgnc2VsZWN0ZWQnKTsgZWxzZSBuLmNsYXNzTGlzdC5yZW1vdmUoJ3NlbGVjdGVkJyk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0UHJldmlldyh0aXRsZSwgY29udGVudCkge1xuICBpZiAoIWluaXRlZCkgZW5zdXJlU2VhcmNoRE9NKCk7XG4gIGlmIChwcmV2aWV3VGl0bGVFbCkgcHJldmlld1RpdGxlRWwudGV4dENvbnRlbnQgPSBTdHJpbmcodGl0bGUgPz8gJycpO1xuICBpZiAocHJldmlld0NvbnRlbnRFbCkgcHJldmlld0NvbnRlbnRFbC50ZXh0Q29udGVudCA9IFN0cmluZyhjb250ZW50ID8/ICcnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFByZXZpZXdEZXRhaWxzKHsgdGl0bGUsIHVybCwgZ3JvdXBUaXRsZSwgbGFzdEFjY2Vzc2VkIH0gPSB7fSkge1xuICBpZiAoIWluaXRlZCkgZW5zdXJlU2VhcmNoRE9NKCk7XG4gIGlmIChwcmV2aWV3VGl0bGVFbCkgcHJldmlld1RpdGxlRWwudGV4dENvbnRlbnQgPSBTdHJpbmcodGl0bGUgPz8gJycpO1xuICBpZiAocHJldmlld1VybEVsKSBwcmV2aWV3VXJsRWwudGV4dENvbnRlbnQgPSBTdHJpbmcodXJsID8/ICcnKTtcbiAgaWYgKHByZXZpZXdDb250ZW50RWwpIHtcbiAgICAvLyBDbGVhciBhbmQgcmVidWlsZCB3aXRoIHN0eWxlZCByb3dzXG4gICAgcHJldmlld0NvbnRlbnRFbC5pbm5lckhUTUwgPSAnJztcbiAgICBjb25zdCByb3cgPSAobGFiZWwsIHZhbHVlKSA9PiB7XG4gICAgICBjb25zdCByID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICByLmNsYXNzTmFtZSA9ICdwcmV2aWV3LW1ldGEtcm93JztcbiAgICAgIGNvbnN0IGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICBsLmNsYXNzTmFtZSA9ICdwcmV2aWV3LWxhYmVsJztcbiAgICAgIGwudGV4dENvbnRlbnQgPSBsYWJlbDtcbiAgICAgIGNvbnN0IHYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICB2LmNsYXNzTmFtZSA9ICdwcmV2aWV3LXZhbHVlJztcbiAgICAgIHYudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgICAgIHIuYXBwZW5kKGwsIHYpO1xuICAgICAgcmV0dXJuIHI7XG4gICAgfTtcblxuICAgIGNvbnN0IGdyb3VwVGV4dCA9IGdyb3VwVGl0bGUgPyBTdHJpbmcoZ3JvdXBUaXRsZSkgOiAnKE5vIGdyb3VwKSc7XG4gICAgcHJldmlld0NvbnRlbnRFbC5hcHBlbmRDaGlsZChyb3coJ0dyb3VwOicsIGdyb3VwVGV4dCkpO1xuXG4gICAgbGV0IGxhc3RTdHIgPSAnXHUyMDE0JztcbiAgICBpZiAobGFzdEFjY2Vzc2VkICE9IG51bGwgJiYgaXNGaW5pdGUobGFzdEFjY2Vzc2VkKSkge1xuICAgICAgdHJ5IHsgbGFzdFN0ciA9IG5ldyBEYXRlKE51bWJlcihsYXN0QWNjZXNzZWQpKS50b0xvY2FsZVN0cmluZygpOyB9IGNhdGNoIChfKSB7IC8qIGlnbm9yZSAqLyB9XG4gICAgfVxuICAgIHByZXZpZXdDb250ZW50RWwuYXBwZW5kQ2hpbGQocm93KCdMYXN0IGFjY2Vzc2VkOicsIGxhc3RTdHIpKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0TG9hZGluZyh2aXNpYmxlKSB7XG4gIGlmICghaW5pdGVkKSBlbnN1cmVTZWFyY2hET00oKTtcbiAgaWYgKCFsb2FkaW5nRWwpIHJldHVybjtcbiAgbG9hZGluZ0VsLnN0eWxlLmRpc3BsYXkgPSB2aXNpYmxlID8gJ2Jsb2NrJyA6ICdub25lJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFudXBTZWFyY2hSZW5kZXIoKSB7XG4gIHRyeSB7IGhvc3Q/LnJlbW92ZSgpOyB9IGZpbmFsbHkge1xuICAgIGluaXRlZCA9IGZhbHNlO1xuICAgIGhvc3QgPSBudWxsOyBzaGFkb3cgPSBudWxsO1xuICAgIG92ZXJsYXlSb290ID0gbnVsbDsgb3ZlcmxheUVsID0gbnVsbDtcbiAgICBpbnB1dEVsID0gbnVsbDsgcmVzdWx0c0VsID0gbnVsbDsgbG9hZGluZ0VsID0gbnVsbDsgcHJldmlld1RpdGxlRWwgPSBudWxsOyBwcmV2aWV3Q29udGVudEVsID0gbnVsbDtcbiAgfVxufVxuIiwgIi8vIENvcmUgdXRpbGl0aWVzIGFuZCBsaWdodHdlaWdodCBjb21wb25lbnRzIHRvIGtlZXAgc2VhcmNoX3VpIGxlYW4gYW5kIGZhc3QuXG5cbmV4cG9ydCBjbGFzcyBEZWJvdW5jZXIge1xuICBjb25zdHJ1Y3RvcihkZWxheSA9IDEyMCkge1xuICAgIHRoaXMuZGVsYXkgPSBkZWxheTtcbiAgICB0aGlzLmlkID0gbnVsbDtcbiAgfVxuICBydW4oZm4pIHtcbiAgICBpZiAodGhpcy5pZCkgY2xlYXJUaW1lb3V0KHRoaXMuaWQpO1xuICAgIHRoaXMuaWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgdHJ5IHsgZm4oKTsgfSBjYXRjaCAoXykge31cbiAgICB9LCB0aGlzLmRlbGF5KTtcbiAgfVxuICBmbHVzaChmbikge1xuICAgIGlmICh0aGlzLmlkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5pZCk7XG4gICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICB9XG4gICAgdHJ5IHsgZm4oKTsgfSBjYXRjaCAoXykge31cbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQmFja2dyb3VuZFNlYXJjaENsaWVudCB7XG4gIHNlYXJjaChxdWVyeSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiAnZnV6enlTZWFyY2gnLCBxdWVyeTogU3RyaW5nKHF1ZXJ5IHx8ICcnKSB9LCAocmVzcCkgPT4ge1xuICAgICAgICAgIGlmICghcmVzcCB8fCByZXNwLm9rICE9PSB0cnVlKSByZXR1cm4gcmVzb2x2ZShbXSk7XG4gICAgICAgICAgcmVzb2x2ZShBcnJheS5pc0FycmF5KHJlc3AucmVzdWx0cykgPyByZXNwLnJlc3VsdHMgOiBbXSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICByZXNvbHZlKFtdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICBhY3RpdmF0ZVRhYih0YWJJZCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiAnYWN0aXZhdGVUYWInLCB0YWJJZCB9LCAoKSA9PiByZXNvbHZlKCkpO1xuICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlc3VsdHNNb2RlbCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuaXRlbXMgPSBbXTtcbiAgICB0aGlzLnNlbGVjdGVkSWR4ID0gLTE7XG4gIH1cbiAgc2l6ZSgpIHsgcmV0dXJuIHRoaXMuaXRlbXMubGVuZ3RoOyB9XG4gIGtleU9mKGl0KSB7XG4gICAgY29uc3QgaWQgPSAoaXQgJiYgKHR5cGVvZiBpdC5pZCA9PT0gJ251bWJlcicgPyBpdC5pZCA6IGl0LmlkIHx8ICcnKSkgKyAnJztcbiAgICBjb25zdCB1cmwgPSAoaXQgJiYgaXQudXJsKSB8fCAnJztcbiAgICBjb25zdCB0aXRsZSA9IChpdCAmJiBpdC50aXRsZSkgfHwgJyc7XG4gICAgcmV0dXJuIGAke2lkfXwke3VybH18JHt0aXRsZX1gO1xuICB9XG4gIGVxdWFscyhsaXN0KSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGxpc3QubGVuZ3RoICE9PSB0aGlzLml0ZW1zLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHRoaXMua2V5T2YobGlzdFtpXSkgIT09IHRoaXMua2V5T2YodGhpcy5pdGVtc1tpXSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgc2V0SXRlbXMobGlzdCkge1xuICAgIGlmICh0aGlzLmVxdWFscyhsaXN0KSkgcmV0dXJuIGZhbHNlO1xuICAgIHRoaXMuaXRlbXMgPSBBcnJheS5pc0FycmF5KGxpc3QpID8gbGlzdCA6IFtdO1xuICAgIC8vIFByZXNlcnZlIHNlbGVjdGlvbiBpZiBwb3NzaWJsZSwgZWxzZSBzZWxlY3QgZmlyc3RcbiAgICBpZiAodGhpcy5pdGVtcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuc2VsZWN0ZWRJZHggPSAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRJZHggPCAwKSB0aGlzLnNlbGVjdGVkSWR4ID0gMDtcbiAgICAgIGlmICh0aGlzLnNlbGVjdGVkSWR4ID49IHRoaXMuaXRlbXMubGVuZ3RoKSB0aGlzLnNlbGVjdGVkSWR4ID0gdGhpcy5pdGVtcy5sZW5ndGggLSAxO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBtb3ZlKGRlbHRhKSB7XG4gICAgaWYgKCF0aGlzLml0ZW1zLmxlbmd0aCkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgbiA9IHRoaXMuaXRlbXMubGVuZ3RoO1xuICAgIHRoaXMuc2VsZWN0ZWRJZHggPSAodGhpcy5zZWxlY3RlZElkeCArIGRlbHRhICsgbikgJSBuO1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnQoKTtcbiAgfVxuICBjdXJyZW50KCkge1xuICAgIGlmICh0aGlzLnNlbGVjdGVkSWR4IDwgMCB8fCB0aGlzLnNlbGVjdGVkSWR4ID49IHRoaXMuaXRlbXMubGVuZ3RoKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5pdGVtc1t0aGlzLnNlbGVjdGVkSWR4XTtcbiAgfVxufVxuIiwgIi8vIENvbnRyb2xsZXIvbG9naWMgZm9yIHRoZSBsaWdodHdlaWdodCBzZWFyY2ggVUkgb3ZlcmxheS5cbi8vIFVzZXMgcmVuZGVyaW5nIGhlbHBlcnMgZnJvbSBzZWFyY2hfcmVuZGVyOyBleHBvcnRzIGluaXQvb3Blbi9jbG9zZS90b2dnbGUgYW5kIGtleSBoYW5kbGluZy5cblxuaW1wb3J0IHtcbiAgZW5zdXJlU2VhcmNoRE9NLFxuICBzZXRPdmVybGF5VmlzaWJsZSxcbiAgaXNPdmVybGF5VmlzaWJsZSxcbiAgZm9jdXNTZWFyY2hJbnB1dCxcbiAgY2xlYXJSZXN1bHRzLFxuICBhcHBlbmRSZXN1bHRJdGVtLFxuICBzZXRTZWxlY3RlZEluZGV4LFxuICBzZXRQcmV2aWV3LFxuICBzZXRQcmV2aWV3RGV0YWlscyxcbiAgc2V0TG9hZGluZyxcbiAgY2xlYW51cFNlYXJjaFJlbmRlcixcbiAgZ2V0SW5wdXRFbGVtZW50LFxufSBmcm9tIFwiLi9zZWFyY2hfcmVuZGVyLmpzXCI7XG5pbXBvcnQgeyBEZWJvdW5jZXIsIEJhY2tncm91bmRTZWFyY2hDbGllbnQsIFJlc3VsdHNNb2RlbCB9IGZyb20gXCIuL3NlYXJjaF9jb3JlLmpzXCI7XG5cbmxldCBpbml0ZWQgPSBmYWxzZTtcbmxldCBsaXN0ZW5lcnNBdHRhY2hlZCA9IGZhbHNlO1xubGV0IGlucHV0TGlzdGVuZXJBdHRhY2hlZCA9IGZhbHNlO1xuY29uc3QgZGVib3VuY2VyID0gbmV3IERlYm91bmNlcigxMjApO1xuY29uc3QgY2xpZW50ID0gbmV3IEJhY2tncm91bmRTZWFyY2hDbGllbnQoKTtcbmNvbnN0IG1vZGVsID0gbmV3IFJlc3VsdHNNb2RlbCgpO1xubGV0IGxhc3RRdWVyeVRva2VuID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRTZWFyY2hVSSgpIHtcbiAgaWYgKGluaXRlZCkgcmV0dXJuO1xuICBpbml0ZWQgPSB0cnVlO1xuICBlbnN1cmVTZWFyY2hET00oKTtcbiAgYXR0YWNoTGlzdGVuZXJzKCk7XG59XG5cbmZ1bmN0aW9uIGF0dGFjaExpc3RlbmVycygpIHtcbiAgaWYgKGxpc3RlbmVyc0F0dGFjaGVkKSByZXR1cm47XG4gIGxpc3RlbmVyc0F0dGFjaGVkID0gdHJ1ZTtcbiAgLy8gSGFuZGxlIGtleWJvYXJkIG9ubHkgd2hlbiBvdmVybGF5IGlzIHZpc2libGU7IGNhcHR1cmUgaXMgZmFsc2UgdG8gcmVzcGVjdCBvdGhlciBoYW5kbGVycyB3aGVuIGNsb3NlZC5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgb25LZXlkb3duLCB7IGNhcHR1cmU6IGZhbHNlIH0pO1xufVxuXG5mdW5jdGlvbiBkZXRhY2hMaXN0ZW5lcnMoKSB7XG4gIGlmICghbGlzdGVuZXJzQXR0YWNoZWQpIHJldHVybjtcbiAgbGlzdGVuZXJzQXR0YWNoZWQgPSBmYWxzZTtcbiAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgb25LZXlkb3duLCB7IGNhcHR1cmU6IGZhbHNlIH0pO1xufVxuXG4vLyBQdWJsaWMga2V5ZG93biBoYW5kbGVyIChvcHRpb25hbCBleHRlcm5hbCB1c2UpXG5leHBvcnQgZnVuY3Rpb24gaGFuZGxlU2VhcmNoS2V5ZG93bihlKSB7IG9uS2V5ZG93bihlKTsgfVxuXG5mdW5jdGlvbiBvbktleWRvd24oZSkge1xuICBpZiAoIWlzT3ZlcmxheVZpc2libGUoKSkgcmV0dXJuO1xuICBjb25zdCBrID0gU3RyaW5nKGUua2V5KTtcbiAgLy8gUHJldmVudCBWaW0gb3IgcGFnZSBoYW5kbGVycyB3aGVuIG9wZW4gZm9yIGNvbW1vbiBuYXYga2V5c1xuICBpZiAoW1wiRXNjYXBlXCIsIFwiQXJyb3dVcFwiLCBcIkFycm93RG93blwiLCBcIkVudGVyXCIsIFwiVGFiXCJdLmluY2x1ZGVzKGspKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gIH1cbiAgaWYgKGsgPT09IFwiRXNjYXBlXCIpIHtcbiAgICBjbG9zZVNlYXJjaFBhbmVsKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChrID09PSBcIkFycm93RG93blwiKSB7XG4gICAgbW92ZVNlbGVjdGlvbigxKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGsgPT09IFwiQXJyb3dVcFwiKSB7XG4gICAgbW92ZVNlbGVjdGlvbigtMSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChrID09PSBcIkVudGVyXCIpIHtcbiAgICBhY3RpdmF0ZVNlbGVjdGlvbigpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoayA9PT0gXCJUYWJcIikge1xuICAgIG1vdmVTZWxlY3Rpb24oZS5zaGlmdEtleSA/IC0xIDogMSk7XG4gICAgcmV0dXJuO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1vdmVTZWxlY3Rpb24oZGVsdGEpIHtcbiAgY29uc3QgaXQgPSBtb2RlbC5tb3ZlKGRlbHRhKTtcbiAgaWYgKCFpdCkgcmV0dXJuO1xuICBzZXRTZWxlY3RlZEluZGV4KG1vZGVsLnNlbGVjdGVkSWR4KTtcbiAgc2V0UHJldmlld0RldGFpbHMoe1xuICAgIHRpdGxlOiBpdC50aXRsZSxcbiAgICB1cmw6IGl0LnVybCB8fCAnJyxcbiAgICBncm91cFRpdGxlOiBpdC5ncm91cFRpdGxlIHx8IGl0Lmdyb3VwIHx8ICcnLFxuICAgIGxhc3RBY2Nlc3NlZDogaXQubGFzdEFjY2Vzc2VkLFxuICB9KTtcbn1cblxuZnVuY3Rpb24gYWN0aXZhdGVTZWxlY3Rpb24oKSB7XG4gIGNvbnN0IGl0ID0gbW9kZWwuY3VycmVudCgpO1xuICBpZiAoaXQgJiYgdHlwZW9mIGl0LmlkID09PSAnbnVtYmVyJykge1xuICAgIHRyeSB7XG4gICAgICBjbGllbnQuYWN0aXZhdGVUYWIoaXQuaWQpO1xuICAgIH0gY2F0Y2ggKF8pIHt9XG4gIH1cbiAgY2xvc2VTZWFyY2hQYW5lbCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gb3BlblNlYXJjaFBhbmVsKCkge1xuICBpbml0U2VhcmNoVUkoKTtcbiAgc2V0T3ZlcmxheVZpc2libGUodHJ1ZSk7XG4gIGdsb2JhbFRoaXMuX193ZXJfc2VhcmNoX29wZW4gPSB0cnVlO1xuICBlbnN1cmVJbnB1dExpc3RlbmVyKCk7XG4gIC8vIFRyaWdnZXIgaW5pdGlhbCBzZWFyY2ggd2l0aCBjdXJyZW50IHZhbHVlIChwb3NzaWJseSBlbXB0eSlcbiAgcXVlcnlBbmRSZW5kZXIoKTtcbiAgZm9jdXNTZWFyY2hJbnB1dCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xvc2VTZWFyY2hQYW5lbCgpIHtcbiAgaW5pdFNlYXJjaFVJKCk7XG4gIHNldE92ZXJsYXlWaXNpYmxlKGZhbHNlKTtcbiAgZ2xvYmFsVGhpcy5fX3dlcl9zZWFyY2hfb3BlbiA9IGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9nZ2xlU2VhcmNoUGFuZWwoKSB7XG4gIGluaXRTZWFyY2hVSSgpO1xuICBjb25zdCB3aWxsT3BlbiA9ICFpc092ZXJsYXlWaXNpYmxlKCk7XG4gIHNldE92ZXJsYXlWaXNpYmxlKHdpbGxPcGVuKTtcbiAgZ2xvYmFsVGhpcy5fX3dlcl9zZWFyY2hfb3BlbiA9IHdpbGxPcGVuO1xuICBpZiAod2lsbE9wZW4pIHtcbiAgICBlbnN1cmVJbnB1dExpc3RlbmVyKCk7XG4gICAgcXVlcnlBbmRSZW5kZXIoKTtcbiAgICBmb2N1c1NlYXJjaElucHV0KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFudXBTZWFyY2hVSSgpIHtcbiAgdHJ5IHsgZGV0YWNoTGlzdGVuZXJzKCk7IGNsZWFudXBTZWFyY2hSZW5kZXIoKTsgfVxuICBmaW5hbGx5IHsgaW5pdGVkID0gZmFsc2U7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU2VhcmNoT3BlbigpIHtcbiAgcmV0dXJuICEhZ2xvYmFsVGhpcy5fX3dlcl9zZWFyY2hfb3Blbjtcbn1cblxuZnVuY3Rpb24gcmVuZGVySXRlbXMoKSB7XG4gIGNsZWFyUmVzdWx0cygpO1xuICBpZiAoIW1vZGVsLnNpemUoKSkge1xuICAgIHNldFByZXZpZXcoXCJQcmV2aWV3XCIsIFwiTm8gdGFiIHNlbGVjdGVkXCIpO1xuICAgIG1vZGVsLnNlbGVjdGVkSWR4ID0gLTE7XG4gICAgcmV0dXJuO1xuICB9XG4gIG1vZGVsLml0ZW1zLmZvckVhY2goKGl0LCBpKSA9PiBhcHBlbmRSZXN1bHRJdGVtKGl0LnRpdGxlLCBpdC5ncm91cFRpdGxlIHx8IGl0Lmdyb3VwIHx8ICcnLCBpID09PSBtb2RlbC5zZWxlY3RlZElkeCkpO1xuICBpZiAobW9kZWwuc2VsZWN0ZWRJZHggPCAwKSB7XG4gICAgbW9kZWwuc2VsZWN0ZWRJZHggPSAwO1xuICAgIHNldFNlbGVjdGVkSW5kZXgobW9kZWwuc2VsZWN0ZWRJZHgpO1xuICB9XG4gIGNvbnN0IGl0ID0gbW9kZWwuY3VycmVudCgpO1xuICBzZXRQcmV2aWV3RGV0YWlscyh7XG4gICAgdGl0bGU6IGl0LnRpdGxlLFxuICAgIHVybDogaXQudXJsIHx8ICcnLFxuICAgIGdyb3VwVGl0bGU6IGl0Lmdyb3VwVGl0bGUgfHwgaXQuZ3JvdXAgfHwgJycsXG4gICAgbGFzdEFjY2Vzc2VkOiBpdC5sYXN0QWNjZXNzZWQsXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVJbnB1dExpc3RlbmVyKCkge1xuICBpZiAoaW5wdXRMaXN0ZW5lckF0dGFjaGVkKSByZXR1cm47XG4gIGNvbnN0IGlucHV0ID0gZ2V0SW5wdXRFbGVtZW50KCk7XG4gIGlmICghaW5wdXQpIHJldHVybjtcbiAgaW5wdXRMaXN0ZW5lckF0dGFjaGVkID0gdHJ1ZTtcbiAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignaW5wdXQnLCAoKSA9PiB7XG4gICAgZGVib3VuY2VyLnJ1bigoKSA9PiB7IHF1ZXJ5QW5kUmVuZGVyKCk7IH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcXVlcnlBbmRSZW5kZXIoKSB7XG4gIGNvbnN0IGlucHV0ID0gZ2V0SW5wdXRFbGVtZW50KCk7XG4gIGNvbnN0IHEgPSBpbnB1dD8udmFsdWUgfHwgJyc7XG4gIHNldExvYWRpbmcodHJ1ZSk7XG4gIGNvbnN0IHRva2VuID0gKytsYXN0UXVlcnlUb2tlbjtcbiAgY2xpZW50LnNlYXJjaChxKS50aGVuKChyZXN1bHRzKSA9PiB7XG4gICAgaWYgKHRva2VuICE9PSBsYXN0UXVlcnlUb2tlbikgcmV0dXJuOyAvLyBzdGFsZSByZXNwb25zZVxuICAgIGNvbnN0IG1hcHBlZCA9IHJlc3VsdHMubWFwKCh0KSA9PiAoe1xuICAgICAgaWQ6IHR5cGVvZiB0Py5pZCA9PT0gJ251bWJlcicgPyB0LmlkIDogKHR5cGVvZiB0Py5pZCA9PT0gJ3N0cmluZycgPyBOdW1iZXIodC5pZCkgOiB1bmRlZmluZWQpLFxuICAgICAgdGl0bGU6IHQ/LnRpdGxlIHx8ICcnLFxuICAgICAgZ3JvdXBUaXRsZTogdD8uZ3JvdXBfdGl0bGUgfHwgJycsXG4gICAgICBncm91cDogdD8uZ3JvdXBfdGl0bGUgfHwgJycsXG4gICAgICB1cmw6IHQ/LnVybCB8fCAnJyxcbiAgICAgIGxhc3RBY2Nlc3NlZDogdHlwZW9mIHQ/Lmxhc3RfYWNjZXNzZWQgPT09ICdudW1iZXInID8gdC5sYXN0X2FjY2Vzc2VkIDogdW5kZWZpbmVkLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IGNoYW5nZWQgPSBtb2RlbC5zZXRJdGVtcyhtYXBwZWQpO1xuICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICByZW5kZXJJdGVtcygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBKdXN0IHVwZGF0ZSBzZWxlY3Rpb24vcHJldmlldyB0byByZWZsZWN0IGFueSBpbmRleCBjbGFtcGluZ1xuICAgICAgY29uc3QgaXQgPSBtb2RlbC5jdXJyZW50KCk7XG4gICAgICBpZiAoaXQpIHtcbiAgICAgICAgc2V0U2VsZWN0ZWRJbmRleChtb2RlbC5zZWxlY3RlZElkeCk7XG4gICAgICAgIHNldFByZXZpZXdEZXRhaWxzKHsgdGl0bGU6IGl0LnRpdGxlLCB1cmw6IGl0LnVybCB8fCAnJywgZ3JvdXBUaXRsZTogaXQuZ3JvdXBUaXRsZSB8fCBpdC5ncm91cCB8fCAnJywgbGFzdEFjY2Vzc2VkOiBpdC5sYXN0QWNjZXNzZWQgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRQcmV2aWV3KCdQcmV2aWV3JywgJ05vIHRhYiBzZWxlY3RlZCcpO1xuICAgICAgfVxuICAgIH1cbiAgICBzZXRMb2FkaW5nKGZhbHNlKTtcbiAgfSkuY2F0Y2goKCkgPT4ge1xuICAgIGlmICh0b2tlbiAhPT0gbGFzdFF1ZXJ5VG9rZW4pIHJldHVybjtcbiAgICBtb2RlbC5zZXRJdGVtcyhbXSk7XG4gICAgcmVuZGVySXRlbXMoKTtcbiAgICBzZXRMb2FkaW5nKGZhbHNlKTtcbiAgfSk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBR0EsSUFBSSxTQUFTO0FBQ2IsSUFBSSxPQUFPO0FBQ1gsSUFBSSxTQUFTO0FBQ2IsSUFBSSxjQUFjO0FBQ2xCLElBQUksWUFBWTtBQUNoQixJQUFJLFVBQVU7QUFDZCxJQUFJLFlBQVk7QUFDaEIsSUFBSSxZQUFZO0FBQ2hCLElBQUksaUJBQWlCO0FBQ3JCLElBQUksZUFBZTtBQUNuQixJQUFJLG1CQUFtQjtBQUV2QixTQUFTLGlCQUFpQjtBQUN4QixNQUFJLENBQUMsS0FBTTtBQUNYLFFBQU0sU0FBUyxNQUFNO0FBQ25CLFFBQUksQ0FBQyxTQUFTLGdCQUFnQixTQUFTLElBQUksR0FBRztBQUM1QyxlQUFTLGdCQUFnQixZQUFZLElBQUk7QUFBQSxJQUMzQztBQUFBLEVBQ0Y7QUFDQSxNQUFJLFNBQVMsZUFBZSxXQUFXO0FBQ3JDLGFBQVMsaUJBQWlCLG9CQUFvQixRQUFRLEVBQUUsTUFBTSxLQUFLLENBQUM7QUFBQSxFQUN0RSxPQUFPO0FBQ0wsV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVPLFNBQVMsa0JBQWtCO0FBQ2hDLE1BQUksT0FBUSxRQUFPLEtBQUs7QUFDeEIsV0FBUztBQUVULFNBQU8sU0FBUyxjQUFjLEtBQUs7QUFDbkMsT0FBSyxNQUFNLE1BQU07QUFDakIsT0FBSyxNQUFNLFdBQVc7QUFDdEIsT0FBSyxNQUFNLFFBQVE7QUFDbkIsT0FBSyxNQUFNLFNBQVM7QUFFcEIsV0FBUyxLQUFLLGFBQWEsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUUzQyxRQUFN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
