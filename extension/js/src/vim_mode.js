// ===== Command Configuration =====
const distance_scroll = 80;
const VIM_COMMANDS = {
  immediate: [
    {
      key: "i",
      mode: "normal",
      description: "Enter insert mode",
      handler: (e, context) => {
        if (context.isInput) return false;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        context.setMode("insert");
        return true;
      },
    },
    {
      key: "escape",
      mode: "insert",
      description: "Exit insert mode",
      handler: (e, context) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        context.setMode("normal");
        if (context.isInput && context.activeElement) {
          context.activeElement.blur();
        }
        return true;
      },
    },
    {
      key: "h",
      mode: "normal",
      description: "Scroll left",
      handler: (e, _context) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.scrollBy({ left: -1 * distance_scroll, behavior: "smooth" });
        return true;
      },
    },
    {
      key: "j",
      mode: "normal",
      description: "Scroll down",
      handler: (e, _context) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.scrollBy({ top: distance_scroll, behavior: "smooth" });
        return true;
      },
    },
    {
      key: "k",
      mode: "normal",
      description: "Scroll up",
      handler: (e, _context) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.scrollBy({ top: -1 * distance_scroll, behavior: "smooth" });
        return true;
      },
    },
    {
      key: "l",
      mode: "normal",
      description: "Scroll right",
      handler: (e, _context) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.scrollBy({ left: distance_scroll, behavior: "smooth" });
        return true;
      },
    },
  ],
};

// ===== Public functions =====
export function initVimMode() {
  // console.log("initVimMode called");
  if (typeof window.vimMode === "undefined") {
    window.vimMode = "normal";
  }
  // console.log("Current vim mode:", window.vimMode);
  updateModeIndicator();
  injectVimStyles();
  // console.log("Vim mode initialized");
}

export function setMode(mode) {
  window.vimMode = mode;
  updateModeIndicator();
}

export function isInputField(element) {
  return (
    element &&
    (element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.isContentEditable)
  );
}

export function injectVimStyles() {
  if (!document.getElementById("vim-mode-styles")) {
    const style = document.createElement("style");
    style.id = "vim-mode-styles";
    style.textContent = `
      .vim-mode-highlight {
        outline: 2px solid #4CAF50 !important;
        outline-offset: 2px !important;
      }
    `;
    document.head.appendChild(style);
  }
}

export function createVimClickHandler() {
  return function clickHandler(e) {
    if (window.vimMode === "normal") {
      const target = e.target;

      if (isInputField(target)) {
        setMode("insert");
      } else {
        e.preventDefault();
        document.querySelectorAll(".vim-mode-highlight").forEach((el) => {
          el.classList.remove("vim-mode-highlight");
        });
        target.classList.add("vim-mode-highlight");
      }
    }
  };
}

export function createVimKeydownHandler(addKey, processBuffer) {
  return function keydownHandler(e) {
    const key = e.key.toLowerCase();
    const activeElement = document.activeElement;
    const isInput = isInputField(activeElement);

    // Build context object for command handlers
    const handlerContext = {
      isInput,
      activeElement,
      setMode: (mode) => setMode(mode),
    };

    // Check immediate commands (i and escape)
    for (const cmd of VIM_COMMANDS.immediate) {
      if (cmd.key === key && window.vimMode === cmd.mode) {
        const handled = cmd.handler(e, handlerContext);
        if (handled) return; // Command handled, stop processing
      }
    }

    // INSERT MODE: Allow normal typing, no command detection
    if (window.vimMode === "insert") {
      return;
    }

    // NORMAL MODE: Command detection and prevention
    if (window.vimMode === "normal") {
      // Prevent focusing input fields in normal mode (keyboard navigation)
      if (isInput) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        activeElement.blur();
        return;
      }

      // Prevent ALL printable character input in normal mode
      const isPrintableKey = key.length === 1 || key === "space";
      if (isPrintableKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }

      addKey(key);
      processBuffer();
    }
  };
}

export function cleanupVimMode() {
  const indicator = document.getElementById("vim-mode-indicator");
  if (indicator) {
    indicator.remove();
  }

  const styles = document.getElementById("vim-mode-styles");
  if (styles) {
    styles.remove();
  }

  document.querySelectorAll(".vim-mode-highlight").forEach((el) => {
    el.classList.remove("vim-mode-highlight");
  });
}

// =================== Private function ===========================
function updateModeIndicator() {
  // console.log("updateModeIndicator called");
  let indicator = document.getElementById("vim-mode-indicator");

  if (!indicator) {
    // console.log("Creating new vim mode indicator");
    indicator = document.createElement("div");
    indicator.id = "vim-mode-indicator";
    if (document.body) {
      document.body.appendChild(indicator);
      console.log("Indicator appended to body");
    } else {
      console.warn("Vim mode: document.body not ready yet");
      return;
    }
  }

  indicator.textContent = window.vimMode.toUpperCase();
  Object.assign(indicator.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    padding: "8px 16px",
    backgroundColor: window.vimMode === "normal" ? "#4CAF50" : "#2196F3",
    color: "white",
    fontFamily: "monospace",
    fontSize: "14px",
    fontWeight: "bold",
    borderRadius: "4px",
    zIndex: 999998,
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    transition: "background-color 0.2s",
  });
}
