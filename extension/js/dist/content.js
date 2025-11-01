(() => {
  // extension/js/src/vim_mode.js
  var currentVimMode = "normal";
  var VIM_MODES = {
    NORMAL: "normal",
    INSERT: "insert",
    VISUAL: "visual"
  };
  var SCROLL_STEP = 80;
  var AUTO_SCROLL_EASE = 10;
  var VIM_COMMANDS = {
    immediate: [
      {
        key: "i",
        mode: "normal",
        description: "Enter insert mode",
        handler: () => {
          currentVimMode = VIM_MODES.INSERT;
          return true;
        }
      },
      {
        key: "h",
        mode: "normal",
        description: "Scroll left",
        handler: (evt) => {
          const isRepeat = !!evt?.repeat;
          const step = isRepeat ? Math.max(1, SCROLL_STEP - AUTO_SCROLL_EASE) : SCROLL_STEP;
          const behavior = isRepeat ? "auto" : "smooth";
          window.scrollBy({ left: -step, behavior });
          return true;
        }
      },
      {
        key: "j",
        mode: "normal",
        description: "Scroll down",
        handler: (evt) => {
          const isRepeat = !!evt?.repeat;
          const step = isRepeat ? Math.max(1, SCROLL_STEP - AUTO_SCROLL_EASE) : SCROLL_STEP;
          const behavior = isRepeat ? "auto" : "smooth";
          window.scrollBy({ top: step, behavior });
          return true;
        }
      },
      {
        key: "k",
        mode: "normal",
        description: "Scroll up",
        handler: (evt) => {
          const isRepeat = !!evt?.repeat;
          const step = isRepeat ? Math.max(1, SCROLL_STEP - AUTO_SCROLL_EASE) : SCROLL_STEP;
          const behavior = isRepeat ? "auto" : "smooth";
          window.scrollBy({ top: -step, behavior });
          return true;
        }
      },
      {
        key: "l",
        mode: "normal",
        description: "Scroll right",
        handler: (evt) => {
          const isRepeat = !!evt?.repeat;
          const step = isRepeat ? Math.max(1, SCROLL_STEP - AUTO_SCROLL_EASE) : SCROLL_STEP;
          const behavior = isRepeat ? "auto" : "smooth";
          window.scrollBy({ left: step, behavior });
          return true;
        }
      },
      {
        key: "C-j",
        mode: "normal",
        description: "Ctrl+J example",
        handler: () => {
          console.log("Execute Ctrl + j");
          return true;
        }
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
        }
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
        }
      },
      {
        key: "gg",
        mode: "normal",
        description: "Go to top of document",
        handler: (evt) => {
          const behavior = evt?.repeat ? "auto" : "smooth";
          window.scrollTo({ top: 0, behavior });
          return true;
        }
      },
      {
        key: "S-g",
        mode: "normal",
        description: "Go to bottom of document",
        handler: (evt) => {
          const behavior = evt?.repeat ? "auto" : "smooth";
          const doc = document.scrollingElement || document.documentElement || document.body;
          window.scrollTo({ top: doc.scrollHeight, behavior });
          return true;
        }
      }
    ]
  };
  var circularBuffer = new Array(10);
  var prevPointer = 0;
  var pointer = 0;
  var timeoutId = null;
  var TIMEOUT = 500;
  function isInputField(element) {
    return element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable);
  }
  function normalizeKeyToken(e) {
    const k = e.key;
    if (k === "Shift" || k === "Control" || k === "Alt" || k === "Meta") {
      return null;
    }
    let base = k.length === 1 ? k.toLowerCase() : k;
    const mods = [];
    if (e.ctrlKey) mods.push("C");
    if (e.shiftKey) mods.push("S");
    const prefix = mods.length ? mods.join("-") + "-" : "";
    return prefix + base;
  }
  var normalModeHandler = (e) => {
    const token = normalizeKeyToken(e);
    if (!token) return false;
    circularBuffer[pointer] = token;
    pointer = (pointer + 1) % circularBuffer.length;
    let keys = "";
    let i = prevPointer;
    while (i !== pointer) {
      keys += circularBuffer[i];
      i = (i + 1) % circularBuffer.length;
    }
    const matches = VIM_COMMANDS.immediate.filter(
      (cmd) => cmd.key.startsWith(keys)
    );
    if (matches.length === 0) {
      prevPointer = pointer;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return false;
    }
    if (matches.length === 1 && matches[0].key === keys) {
      prevPointer = pointer;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      matches[0].handler(e);
      return true;
    } else {
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
  var insertModeHandler = (e) => {
    if (e.key === "Escape") {
      currentVimMode = VIM_MODES.NORMAL;
      e.preventDefault();
    }
  };
  var handleKeydown = (e) => {
    switch (currentVimMode) {
      case VIM_MODES.NORMAL: {
        e.preventDefault();
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
  var handleClick = (e) => {
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

  // extension/js/src/main.js
  var BOOTSTRAP_FLAG = "__wer_bootstrap_installed";
  if (!globalThis[BOOTSTRAP_FLAG]) {
    globalThis[BOOTSTRAP_FLAG] = true;
    console.log("Default mode: " + currentVimMode);
    document.addEventListener("keydown", handleKeydown, { capture: true });
    document.addEventListener("click", handleClick, { capture: true });
    chrome.runtime.onMessage.addListener(async (msg) => {
      if (msg?.action === "cleanup") {
        document.removeEventListener("keydown", handleKeydown, { capture: true });
        document.removeEventListener("click", handleClick, { capture: true });
      }
    });
  }
})();
