export let currentVimMode = "normal";

// ============ PRIVATE VARIABLE ===============
const VIM_MODES = {
  NORMAL: "normal",
  INSERT: "insert",
  VISUAL: "visual",
};

const SCROLL_STEP = 80;
const AUTO_SCROLL_EASE = 10;

// Lazy loader for the search UI (built as an ESM dynamic import target)
let __searchLoaded = false;
let __searchModPromise = null;
function loadSearchUI() {
  if (__searchLoaded) return __searchModPromise;
  if (!__searchModPromise) {
    const url = (globalThis.chrome && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL("js/dist/search_ui.js")
      : "/js/dist/search_ui.js"; // fallback path for dev
    __searchModPromise = import(url).then((mod) => {
      try { mod.initSearchUI?.(); } catch (_) {}
      __searchLoaded = true;
      return mod;
    });
  }
  return __searchModPromise;
}

const VIM_COMMANDS = {
  immediate: [
    {
      key: "i",
      mode: "normal",
      description: "Enter insert mode",
      handler: () => {
        currentVimMode = VIM_MODES.INSERT;
        return true;
      },
    },
    {
      key: "ffq",
      mode: "normal",
      description: "Open search panel",
      handler: (_evt) => {
        // Lazy-load the search UI bundle like vim_display
        loadSearchUI().then((m) => m.openSearchPanel?.());
        return true;
      },
    },
    {
      key: "h",
      mode: "normal",
      description: "Scroll left",
      handler: (evt) => {
        const isRepeat = !!evt?.repeat;
        const step = isRepeat
          ? Math.max(1, SCROLL_STEP - AUTO_SCROLL_EASE)
          : SCROLL_STEP;
        const behavior = isRepeat ? "auto" : "smooth";
        window.scrollBy({ left: -step, behavior });
        return true;
      },
    },
    {
      key: "j",
      mode: "normal",
      description: "Scroll down",
      handler: (evt) => {
        const isRepeat = !!evt?.repeat;
        const step = isRepeat
          ? Math.max(1, SCROLL_STEP - AUTO_SCROLL_EASE)
          : SCROLL_STEP;
        const behavior = isRepeat ? "auto" : "smooth";
        window.scrollBy({ top: step, behavior });
        return true;
      },
    },
    {
      key: "k",
      mode: "normal",
      description: "Scroll up",
      handler: (evt) => {
        const isRepeat = !!evt?.repeat;
        const step = isRepeat
          ? Math.max(1, SCROLL_STEP - AUTO_SCROLL_EASE)
          : SCROLL_STEP;
        const behavior = isRepeat ? "auto" : "smooth";
        window.scrollBy({ top: -step, behavior });
        return true;
      },
    },
    {
      key: "l",
      mode: "normal",
      description: "Scroll right",
      handler: (evt) => {
        const isRepeat = !!evt?.repeat;
        const step = isRepeat
          ? Math.max(1, SCROLL_STEP - AUTO_SCROLL_EASE)
          : SCROLL_STEP;
        const behavior = isRepeat ? "auto" : "smooth";
        window.scrollBy({ left: step, behavior });
        return true;
      },
    },
    {
      key: "C-j",
      mode: "normal",
      description: "Ctrl+J example",
      handler: (_evt) => {
        console.log("Execute Ctrl + j");
        return true;
      },
    },
    {
      key: ["C-j", "j"],
      mode: "normal",
      description: "Demo: Ctrl+J then j",
      handler: (_evt) => {
        console.log("Execute Ctrl + j, then j");
        return true;
      },
    },
    {
      key: ["C-j", "k"],
      mode: "normal",
      description: "Demo: Ctrl+J then Ctrl+K",
      handler: () => {
        console.log("Execute Ctrl + j, then k");
        return true;
      },
    },
    {
      key: "C-d",
      mode: "normal",
      description: "Page down",
      handler: (evt) => {
        const isRepeat = !!evt?.repeat;
        const page = Math.max(1, Math.floor(window.innerHeight * 0.9));
        const step = isRepeat ? Math.max(1, page - AUTO_SCROLL_EASE) : page;
        const behavior = isRepeat ? "auto" : "smooth";
        window.scrollBy({ top: step, behavior });
        return true;
      },
    },
    {
      key: "C-u",
      mode: "normal",
      description: "Page up",
      handler: (evt) => {
        const isRepeat = !!evt?.repeat;
        const page = Math.max(1, Math.floor(window.innerHeight * 0.9));
        const step = isRepeat ? Math.max(1, page - AUTO_SCROLL_EASE) : page;
        const behavior = isRepeat ? "auto" : "smooth";
        window.scrollBy({ top: -step, behavior });
        return true;
      },
    },
    {
      key: "gg",
      mode: "normal",
      description: "Go to top of document",
      handler: (evt) => {
        const behavior = evt?.repeat ? "auto" : "smooth";
        window.scrollTo({ top: 0, behavior });
        return true;
      },
    },
    {
      key: "S-g",
      mode: "normal",
      description: "Go to bottom of document",
      handler: (evt) => {
        const behavior = evt?.repeat ? "auto" : "smooth";
        const doc =
          document.scrollingElement ||
          document.documentElement ||
          document.body;
        window.scrollTo({ top: doc.scrollHeight, behavior });
        return true;
      },
    },
  ],
};

// Sequence state enum for maintainability
const SEQUENCE_STATE = {
  IDLE: "idle",
  PREFIX: "prefix",
  PENDING_EXACT: "pendingExact",
};

// Sequence matching state (prefix trie based)
// Use a tiny ring buffer to avoid allocations and shifts.
let RB_CAP = 2; // will be set from MAX_SEQ_LEN after trie build
let rb = new Array(2);
let rbStart = 0; // index of oldest
let rbSize = 0;  // number of valid tokens
const TIMEOUT = 500;
// Single sequence timer/state (unifies prefix and pending-exact timers)
let seqTimerId = null; // number | null
let seqState = SEQUENCE_STATE.IDLE; // see SEQUENCE_STATE
let seqHandler = null; // function | null (lastExact for prefix, exact for pendingExact)

// Sequence state machine helpers
// See README.md for the Mermaid diagram of these states and transitions.
function clearSeqTimer() {
  if (seqTimerId) {
    clearTimeout(seqTimerId);
    seqTimerId = null;
  }
}

function resetSeqState() {
  seqState = SEQUENCE_STATE.IDLE;
  seqHandler = null;
}

// Start a unified timeout window for either PREFIX or PENDING_EXACT
// If a handler is provided, it will run on timeout (e.g., lastExact for PREFIX, exact for PENDING_EXACT)
function startSequenceWait(state, handler) {
  clearSeqTimer();
  seqState = state;
  seqHandler = handler || null;
  seqTimerId = setTimeout(() => {
    // Only fire if we're still in the same state (no interference from new keys)
    if (seqState === state && seqHandler) {
      try { seqHandler(); } catch (_) {}
    }
    rbClear();
    resetSeqState();
    clearSeqTimer();
  }, TIMEOUT);
}

// If we were deferring an exact (PENDING_EXACT), flush it immediately (on divergence)
function flushPendingIfAny() {
  if (seqState === SEQUENCE_STATE.PENDING_EXACT && seqHandler) {
    const handler = seqHandler;
    clearSeqTimer();
    resetSeqState();
    try { handler(); } catch (_) {}
  }
}

// Build a tiny prefix trie for fast matching
function commandKeyToTokens(key) {
  // Allow array form directly, e.g., ["C-j", "j"]
  if (Array.isArray(key)) return key.slice();
  const keyStr = String(key);
  // Space-delimited tokens, e.g., "C-j j" => ["C-j","j"]
  if (keyStr.includes(" ")) return keyStr.trim().split(/\s+/);

  // Hyphen handling: treat leading modifiers (C, S) as part of first token only.
  // Example: "C-j-j" => ["C-j", "j"] ; "C-S-j-g" => ["C-S-j", "g"]
  if (keyStr.includes("-")) {
    const segs = keyStr.split("-");
    let i = 0;
    const mods = [];
    while (i < segs.length && (segs[i] === "C" || segs[i] === "S")) {
      mods.push(segs[i]);
      i++;
    }
    if (i < segs.length) {
      const base = segs[i++];
      const first = (mods.length ? mods.join("-") + "-" : "") + base;
      const rest = segs.slice(i);
      return [first, ...rest];
    }
    return [keyStr];
  }

  // Fallback: split into individual characters (e.g., "gg" => ["g","g"]).
  return keyStr.split("");
}

function buildCommandTrie(commands) {
  const root = { children: new Map(), handler: null };
  let maxLen = 1;
  for (const cmd of commands) {
    const tokens = commandKeyToTokens(cmd.key);
    maxLen = Math.max(maxLen, tokens.length);
    let node = root;
    for (const t of tokens) {
      if (!node.children.has(t))
        node.children.set(t, { children: new Map(), handler: null });
      node = node.children.get(t);
    }
    // Last token: store handler
    node.handler = cmd.handler;
  }
  return { root, maxLen };
}

const { root: COMMAND_TRIE, maxLen: MAX_SEQ_LEN } = buildCommandTrie(
  VIM_COMMANDS.immediate,
);
// Initialize ring buffer capacity from computed max length (min 1)
RB_CAP = Math.max(1, MAX_SEQ_LEN);
rb = new Array(RB_CAP);

// ============ PRIVATE function ===============

export function isInputField(element) {
  return (
    element &&
    (element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.isContentEditable)
  );
}

// Normalize a key event into a token that includes Ctrl/Shift when present.
// Caller pre-computes whether this is the first token in the sequence for perf.
// Examples: "j", "C-j", "S-j", "C-S-j", "S-ArrowDown"
function normalizeKeyToken(e, isFirst) {
  const k = e.key;

  // Ignore standalone modifier keys
  if (k === "Shift" || k === "Control" || k === "Alt" || k === "Meta") {
    return null;
  }

  // Base key (lowercased for letters to keep tokens consistent)
  let base = k.length === 1 ? k.toLowerCase() : k;

  // Fast path: non-first tokens ignore modifiers (keeps sequences smooth)
  if (!isFirst) return base;

  // Only encode modifiers on the FIRST token of a sequence
  const mods = [];
  if (e.ctrlKey) mods.push("C");
  if (e.shiftKey) mods.push("S");
  return mods.length ? mods.join("-") + "-" + base : base;
}

// Helper: ring buffer operations
function rbClear() {
  rbStart = 0; rbSize = 0;
}
function rbPush(token) {
  if (rbSize < RB_CAP) {
    rb[(rbStart + rbSize) % RB_CAP] = token;
    rbSize++;
  } else {
    // overwrite oldest
    rb[rbStart] = token;
    rbStart = (rbStart + 1) % RB_CAP;
  }
}
function rbSetLatest(token) {
  rbStart = 0; rbSize = 1; rb[0] = token;
}

// Attempt to match tokens currently in ring buffer
function attemptMatchFromRing() {
  let node = COMMAND_TRIE;
  let lastExact = null;
  for (let i = 0; i < rbSize; i++) {
    const t = rb[(rbStart + i) % RB_CAP];
    const next = node.children.get(t);
    if (!next) {
      return { type: "none", lastExact };
    }
    node = next;
    if (node.handler) lastExact = { handler: node.handler, depth: i + 1 };
  }
  if (node.handler) return { type: "exact", handler: node.handler, hasChildren: node.children.size > 0 };
  if (node.children.size > 0) return { type: "prefix", lastExact };
  return { type: "none", lastExact };
}

// Returns true if the key was handled (exact or prefix match), false otherwise
const normalModeHandler = (e) => {
  // Pre-compute "is first token" so normalizer can take the fast path
  const token = normalizeKeyToken(e, rbSize === 0);
  if (!token) return false; // ignored (pure modifier)

  // Append token (ring buffer)
  rbPush(token);

  // Try to match the current buffer
  let result = attemptMatchFromRing();

  switch (result.type) {
    case "exact": {
      // Clear any existing sequence timer and reset state
      clearSeqTimer();
      resetSeqState();
      if (result.hasChildren) {
        startSequenceWait(SEQUENCE_STATE.PENDING_EXACT, result.handler);
        return true;
      }
      try { result.handler(e); } catch (_) {}
      rbClear();
      return true;
    }
    case "prefix": {
      const lastExact = result.lastExact; // may be null
      startSequenceWait(SEQUENCE_STATE.PREFIX, lastExact?.handler || null);
      return true;
    }
    case "none":
    default:
      // fall through to divergence handling
      break;
  }

  // No match with current buffer; try with only the latest token
  // If we had a pending exact waiting for continuation, flush it immediately on divergence
  flushPendingIfAny();

  rbSetLatest(token);
  result = attemptMatchFromRing();
  switch (result.type) {
    case "exact": {
      clearSeqTimer();
      resetSeqState();
      if (result.hasChildren) {
        startSequenceWait(SEQUENCE_STATE.PENDING_EXACT, result.handler);
        return true;
      }
      try { result.handler(e); } catch (_) {}
      rbClear();
      return true;
    }
    case "prefix": {
      startSequenceWait(SEQUENCE_STATE.PREFIX, null); // no shorter exact known here
      return true;
    }
    case "none":
    default:
      break;
  }

  // Still no match
  clearSeqTimer();
  resetSeqState();
  rbClear();
  return false;
};

const insertModeHandler = (e) => {
  if (e.key === "Escape") {
    currentVimMode = VIM_MODES.NORMAL;
    e.preventDefault();
  }
};

export const handleKeydown = (e) => {
  switch (currentVimMode) {
    case VIM_MODES.NORMAL: {
      // If search overlay is open, let it handle keys and don't intercept
      if (globalThis.__wer_search_open) {
        return;
      }
      e.preventDefault();
      // e.stopPropagation();
      // e.stopImmediatePropagation();
      normalModeHandler(e);
      break;
    }
    case VIM_MODES.INSERT:
      insertModeHandler(e);
      break;
    default:
      console.warn("Unexpected mode:", currentVimMode);
      break;
  }
};

export const handleClick = (e) => {
  switch (currentVimMode) {
    case VIM_MODES.NORMAL: {
      const target = e.target;
      if (isInputField(target)) {
        currentVimMode = VIM_MODES.INSERT;
      }
      break;
    }
    case VIM_MODES.INSERT:
      break;
    default:
      console.warn("Unexpected mode:", currentVimMode);
      break;
  }
};
