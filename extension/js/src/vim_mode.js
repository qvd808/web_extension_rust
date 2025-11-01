export let currentVimMode = "normal";

// ============ PRIVATE VARIABLE ===============
const VIM_MODES = {
  NORMAL: "normal",
  INSERT: "insert",
  VISUAL: "visual",
};

const SCROLL_STEP = 80;
const AUTO_SCROLL_EASE = 10;

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
      handler: () => {
        console.log("Execute Ctrl + j");
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

const circularBuffer = new Array(10);

let prevPointer = 0;
let pointer = 0;
let timeoutId = null;
const TIMEOUT = 500;

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
// Examples: "j", "C-j", "S-j", "C-S-j", "S-ArrowDown"
function normalizeKeyToken(e) {
  const k = e.key;

  // Ignore standalone modifier keys
  if (k === "Shift" || k === "Control" || k === "Alt" || k === "Meta") {
    return null;
  }

  // Base key (lowercased for letters to keep tokens consistent)
  let base = k.length === 1 ? k.toLowerCase() : k;

  const mods = [];
  if (e.ctrlKey) mods.push("C");
  if (e.shiftKey) mods.push("S");

  const prefix = mods.length ? mods.join("-") + "-" : "";
  return prefix + base;
}

// Returns true if the key was handled (exact or prefix match), false otherwise
const normalModeHandler = (e) => {
  const token = normalizeKeyToken(e);
  if (!token) return false; // ignored (pure modifier)

  circularBuffer[pointer] = token;
  pointer = (pointer + 1) % circularBuffer.length;

  // Build the current key sequence
  let keys = "";
  let i = prevPointer;
  while (i !== pointer) {
    keys += circularBuffer[i];
    i = (i + 1) % circularBuffer.length;
  }

  // Find matching commands
  const matches = VIM_COMMANDS.immediate.filter((cmd) =>
    cmd.key.startsWith(keys),
  );

  if (matches.length === 0) {
    // No match, reset
    prevPointer = pointer;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    return false;
  }

  if (matches.length === 1 && matches[0].key === keys) {
    // Exact match, execute immediately
    prevPointer = pointer;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    matches[0].handler(e);
    return true;
  } else {
    // Multiple matches: wait for timeout
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const exactMatch = matches.find((m) => m.key === keys);
      if (exactMatch) exactMatch.handler();
      prevPointer = pointer;
      timeoutId = null;
    }, TIMEOUT);
    return true;
  }
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
    }
    case VIM_MODES.INSERT:
      break;
    default:
      console.warn("Unexpected mode:", currentVimMode);
      break;
  }
};
