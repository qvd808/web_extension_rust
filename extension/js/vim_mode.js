// ===== Vim Mode Functions =====
export function initVimMode() {
  console.log("initVimMode called");
  // Use window property to persist across script re-injections
  if (typeof window.vimMode === "undefined") {
    window.vimMode = "normal";
  }
  console.log("Current vim mode:", window.vimMode);
  updateModeIndicator();
  injectVimStyles();
  console.log("Vim mode initialized");
}

export function setMode(mode) {
  window.vimMode = mode;
  updateModeIndicator();
}

function updateModeIndicator() {
  console.log("updateModeIndicator called");
  let indicator = document.getElementById("vim-mode-indicator");

  if (!indicator) {
    console.log("Creating new vim mode indicator");
    indicator = document.createElement("div");
    indicator.id = "vim-mode-indicator";
    // Ensure body exists before appending
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
        // Click on input field in normal mode -> switch to insert mode
        // Don't prevent default - let the focus happen naturally
        setMode("insert");
        // Input will be focused by the browser automatically
      } else {
        // Click on non-input element -> just highlight it
        e.preventDefault();
        // Remove previous highlights
        document.querySelectorAll(".vim-mode-highlight").forEach((el) => {
          el.classList.remove("vim-mode-highlight");
        });
        // Add highlight to clicked element
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

    // ESC to switch to normal mode from insert mode
    if (key === "escape" && window.vimMode === "insert") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setMode("normal");
      // Blur active element if in input field
      if (isInput) {
        activeElement.blur();
      }
      return;
    }

    // 'i' to enter insert mode from normal mode
    if (key === "i" && window.vimMode === "normal" && !isInput) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setMode("insert");
      return;
    }

    // INSERT MODE: Allow normal typing, no command detection
    if (window.vimMode === "insert") {
      return; // Let browser handle all keys normally
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
      // Stop propagation to prevent page's handlers from running
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
  // Remove mode indicator
  const indicator = document.getElementById("vim-mode-indicator");
  if (indicator) {
    indicator.remove();
  }

  // Remove highlight styles
  const styles = document.getElementById("vim-mode-styles");
  if (styles) {
    styles.remove();
  }

  // Remove all highlights
  document.querySelectorAll(".vim-mode-highlight").forEach((el) => {
    el.classList.remove("vim-mode-highlight");
  });
}