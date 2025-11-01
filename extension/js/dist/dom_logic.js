// extension/js/src/dom_logic.js
var inited = false;
var host;
var shadow;
var badgeEl;
var panelEl;
function initOnce() {
  if (inited) return;
  inited = true;
  host = document.createElement("div");
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.zIndex = "2147483647";
  host.style.inset = "auto 16px 16px auto";
  shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .badge {
      font: 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #222; color: #fff;
      padding: 6px 8px; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,.25);
      cursor: default; user-select: none;
      min-width: 60px; text-align: center;
    }
    .panel {
      margin-top: 8px;
      width: 340px; max-height: 260px; overflow: auto;
      background: #1e1e1e; color: #ccc; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.35);
      border: 1px solid #333;
      padding: 10px;
      display: none;
    }
    .panel h4 { margin: 0 0 8px 0; color: #fff; font-weight: 600; }
    .panel p { margin: 0; line-height: 1.4; }
    .kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background:#2a2a2a; padding:2px 6px; border-radius:6px; }
  `;
  badgeEl = document.createElement("div");
  badgeEl.className = "badge";
  badgeEl.textContent = "Ready";
  panelEl = document.createElement("div");
  panelEl.className = "panel";
  panelEl.innerHTML = `
    <h4>Demo Panel</h4>
    <p>Press <span class="kbd">Ctrl</span> + <span class="kbd">K</span> to toggle this panel.</p>
    <p>Last key: <span id="last-key">\u2014</span></p>
  `;
  shadow.append(style, badgeEl, panelEl);
  document.documentElement.appendChild(host);
}
function onKeydown(e) {
  if (badgeEl) badgeEl.textContent = `Key: ${e.key}`;
  const lastKey = shadow?.getElementById?.("last-key");
  if (lastKey) lastKey.textContent = `${e.ctrlKey ? "Ctrl+" : ""}${e.key}`;
  if (e.ctrlKey && e.key.toLowerCase() === "k") {
    e.preventDefault();
    togglePanel();
  }
}
function togglePanel() {
  if (!panelEl) return;
  const nowVisible = panelEl.style.display !== "block";
  panelEl.style.display = nowVisible ? "block" : "none";
  if (nowVisible) {
    if (badgeEl) badgeEl.textContent = "Panel open";
  }
}
function cleanup() {
  try {
    host?.remove();
  } finally {
    inited = false;
    host = null;
    shadow = null;
    badgeEl = null;
    panelEl = null;
  }
}
export {
  cleanup,
  initOnce,
  onKeydown
};
