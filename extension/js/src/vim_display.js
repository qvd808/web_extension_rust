// Lightweight mode indicator UI (no changes to vim_mode logic)
// Renders a small badge at bottom-right showing the current Vim mode.

let inited = false;
let host = null; // <div> host attached to DOM
let shadow = null; // ShadowRoot
let badgeEl = null; // mode badge
let lastMode = null;

export function initVimDisplay() {
  if (inited) return;
  inited = true;

  // Create host that isolates UI from page CSS
  host = document.createElement("div");
  host.style.all = "initial";
  host.style.position = "fixed";
  host.style.zIndex = "2147483647"; // on top
  host.style.inset = "auto 16px 16px auto"; // bottom-right

  shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .badge {
      font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #2a2a2a; color: #fff;
      padding: 6px 10px; border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,.25);
      cursor: default; user-select: none;
      min-width: 70px; text-align: center;
      border: 1px solid #3a3a3a;
    }
  `;

  badgeEl = document.createElement("div");
  badgeEl.className = "badge";
  badgeEl.textContent = "VIM";

  shadow.append(style, badgeEl);

  // Attach when body is ready
  const attach = () => {
    if (!document.documentElement.contains(host)) {
      document.documentElement.appendChild(host);
    }
    // Initial sync
    // Mode will be provided by caller later via syncVimDisplay(mode)
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach, { once: true });
  } else {
    attach();
  }
}

function modeColor(mode) {
  switch (mode) {
    case "normal":
      return "#4CAF50"; // green
    case "insert":
      return "#2196F3"; // blue
    case "visual":
      return "#9C27B0"; // purple
    default:
      return "#616161"; // gray
  }
}

function render(mode) {
  if (!badgeEl) return;
  badgeEl.textContent = `VIM: ${String(mode || "?").toUpperCase()}`;
  badgeEl.style.background = modeColor(mode);
}

export function syncVimDisplay(mode) {
  if (!inited) initVimDisplay();
  if (mode !== lastMode) {
    lastMode = mode;
    render(mode);
  }
}

export function cleanupVimDisplay() {
  try {
    host?.remove();
  } finally {
    inited = false;
    host = null;
    shadow = null;
    badgeEl = null;
    lastMode = null;
  }
}
