(() => {
  // extension/js/src/vim_mode.js
  var distance_scroll = 80;
  var VIM_COMMANDS = {
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
        }
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
        }
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
        }
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
        }
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
        }
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
        }
      }
    ]
  };
  function initVimMode() {
    console.log("initVimMode called");
    if (typeof window.vimMode === "undefined") {
      window.vimMode = "normal";
    }
    console.log("Current vim mode:", window.vimMode);
    updateModeIndicator();
    injectVimStyles();
    console.log("Vim mode initialized");
  }
  function setMode(mode) {
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
      transition: "background-color 0.2s"
    });
  }
  function isInputField(element) {
    return element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable);
  }
  function injectVimStyles() {
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
  function createVimClickHandler() {
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
  function createVimKeydownHandler(addKey, processBuffer) {
    return function keydownHandler(e) {
      const key = e.key.toLowerCase();
      const activeElement = document.activeElement;
      const isInput = isInputField(activeElement);
      const handlerContext = {
        isInput,
        activeElement,
        setMode: (mode) => setMode(mode)
      };
      for (const cmd of VIM_COMMANDS.immediate) {
        if (cmd.key === key && window.vimMode === cmd.mode) {
          const handled = cmd.handler(e, handlerContext);
          if (handled) return;
        }
      }
      if (window.vimMode === "insert") {
        return;
      }
      if (window.vimMode === "normal") {
        if (isInput) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          activeElement.blur();
          return;
        }
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
  function cleanupVimMode() {
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

  // extension/js/src/main.js
  var KEYBIND_CONFIG = window.KEYBIND_CONFIG;
  var UI_CONFIG = window.UI_CONFIG;
  if (!window.keybindListenerInstalled) {
    let addKey = function(key) {
      circularBuffer[pointer] = { key, timestamp: Date.now() };
      pointer = (pointer + 1) % maxSequenceLength;
      if (bufferSize < maxSequenceLength) bufferSize++;
    }, sendMessageAsync = function(message) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
    };
    window.keybindListenerInstalled = true;
    if (document.body) {
      initVimMode();
    } else {
      document.addEventListener("DOMContentLoaded", initVimMode);
    }
    const commands = KEYBIND_CONFIG.COMMANDS.map((cmd) => ({
      name: cmd.name,
      keys: cmd.keybind.replace(/<space>/gi, " ").split("").map((k) => k.toLowerCase())
    }));
    const maxSequenceLength = Math.max(...commands.map((c) => c.keys.length));
    const circularBuffer = new Array(maxSequenceLength);
    let pointer = 0;
    let bufferSize = 0;
    let batchScheduled = false;
    async function processCircularBuffer() {
      for (const cmd of commands) {
        if (bufferSize < cmd.keys.length) continue;
        const keysOnly = [];
        for (let i = bufferSize - cmd.keys.length; i < bufferSize; i++) {
          const idx = (pointer + i) % maxSequenceLength;
          keysOnly.push(circularBuffer[idx].key);
        }
        const timeDiff = circularBuffer[(pointer + bufferSize - 1) % maxSequenceLength].timestamp - circularBuffer[(pointer + bufferSize - cmd.keys.length) % maxSequenceLength].timestamp;
        if (keysOnly.every((k, i) => k === cmd.keys[i]) && timeDiff <= KEYBIND_CONFIG.MAX_SEQUENCE_TIME) {
          try {
            const response = await sendMessageAsync({
              action: "commandTriggered",
              command: cmd.name
            });
            if (response?.success) {
              switch (cmd.name) {
                case "FuzzyFinder":
                  injectIframe(chrome.runtime.getURL("js/search.html"));
                  break;
                default:
                  console.log("Command executed:", cmd.name);
              }
            } else {
              console.warn("Command failed - back ground send false:");
            }
          } catch (err) {
            console.error("Failed to send message to background:", err);
          }
          bufferSize = 0;
          break;
        }
      }
      batchScheduled = false;
    }
    const clickHandler = createVimClickHandler();
    const keydownHandler = createVimKeydownHandler(addKey, () => {
      if (!batchScheduled) {
        batchScheduled = true;
        requestAnimationFrame(processCircularBuffer);
      }
    });
    document.addEventListener("keydown", keydownHandler, true);
    document.addEventListener("click", clickHandler, true);
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === "cleanup") {
        console.log("Cleaning up key listener");
        document.removeEventListener("keydown", keydownHandler, true);
        document.removeEventListener("click", clickHandler, true);
        cleanupVimMode();
        window.keybindListenerInstalled = false;
      }
    });
  }
  function injectIframe(url) {
    if (document.getElementById("extension-iframe-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "extension-iframe-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "transparent",
      zIndex: UI_CONFIG?.IFRAME?.Z_INDEX || 999999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(4px)"
    });
    const iframe = document.createElement("iframe");
    iframe.src = url;
    Object.assign(iframe.style, {
      width: UI_CONFIG?.IFRAME?.WIDTH || "900px",
      height: UI_CONFIG?.IFRAME?.HEIGHT || "500px",
      border: "none",
      borderRadius: UI_CONFIG?.IFRAME?.BORDER_RADIUS || "8px",
      backgroundColor: "transparent",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)"
    });
    iframe.addEventListener("load", () => {
      setTimeout(() => {
        iframe.contentWindow.postMessage({ action: "focusSearch" }, "*");
      }, 100);
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  }
  window.addEventListener("message", (event) => {
    if (event.data?.action === "closeIframe") {
      const overlay = document.getElementById("extension-iframe-overlay");
      overlay?.remove();
    }
  });
})();
