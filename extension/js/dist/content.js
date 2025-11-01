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
        key: ["C-j", "j"],
        mode: "normal",
        description: "Demo: Ctrl+J then j",
        handler: () => {
          console.log("Execute Ctrl + j, then j");
          return true;
        }
      },
      {
        key: ["C-j", "k"],
        mode: "normal",
        description: "Demo: Ctrl+J then Ctrl+K",
        handler: () => {
          console.log("Execute Ctrl + j, then k");
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
  var SEQUENCE_STATE = {
    IDLE: "idle",
    PREFIX: "prefix",
    PENDING_EXACT: "pendingExact"
  };
  var RB_CAP = 2;
  var rb = new Array(2);
  var rbStart = 0;
  var rbSize = 0;
  var TIMEOUT = 500;
  var seqTimerId = null;
  var seqState = SEQUENCE_STATE.IDLE;
  var seqHandler = null;
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
  function startSequenceWait(state, handler) {
    clearSeqTimer();
    seqState = state;
    seqHandler = handler || null;
    seqTimerId = setTimeout(() => {
      if (seqState === state && seqHandler) {
        try {
          seqHandler();
        } catch (_) {
        }
      }
      rbClear();
      resetSeqState();
      clearSeqTimer();
    }, TIMEOUT);
  }
  function flushPendingIfAny() {
    if (seqState === SEQUENCE_STATE.PENDING_EXACT && seqHandler) {
      const handler = seqHandler;
      clearSeqTimer();
      resetSeqState();
      try {
        handler();
      } catch (_) {
      }
    }
  }
  function commandKeyToTokens(key) {
    if (Array.isArray(key)) return key.slice();
    const keyStr = String(key);
    if (keyStr.includes(" ")) return keyStr.trim().split(/\s+/);
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
    return keyStr.split("");
  }
  function buildCommandTrie(commands) {
    const root = { children: /* @__PURE__ */ new Map(), handler: null };
    let maxLen = 1;
    for (const cmd of commands) {
      const tokens = commandKeyToTokens(cmd.key);
      maxLen = Math.max(maxLen, tokens.length);
      let node = root;
      for (const t of tokens) {
        if (!node.children.has(t))
          node.children.set(t, { children: /* @__PURE__ */ new Map(), handler: null });
        node = node.children.get(t);
      }
      node.handler = cmd.handler;
    }
    return { root, maxLen };
  }
  var { root: COMMAND_TRIE, maxLen: MAX_SEQ_LEN } = buildCommandTrie(
    VIM_COMMANDS.immediate
  );
  RB_CAP = Math.max(1, MAX_SEQ_LEN);
  rb = new Array(RB_CAP);
  function isInputField(element) {
    return element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable);
  }
  function normalizeKeyToken(e, isFirst) {
    const k = e.key;
    if (k === "Shift" || k === "Control" || k === "Alt" || k === "Meta") {
      return null;
    }
    let base = k.length === 1 ? k.toLowerCase() : k;
    if (!isFirst) return base;
    const mods = [];
    if (e.ctrlKey) mods.push("C");
    if (e.shiftKey) mods.push("S");
    return mods.length ? mods.join("-") + "-" + base : base;
  }
  function rbClear() {
    rbStart = 0;
    rbSize = 0;
  }
  function rbPush(token) {
    if (rbSize < RB_CAP) {
      rb[(rbStart + rbSize) % RB_CAP] = token;
      rbSize++;
    } else {
      rb[rbStart] = token;
      rbStart = (rbStart + 1) % RB_CAP;
    }
  }
  function rbSetLatest(token) {
    rbStart = 0;
    rbSize = 1;
    rb[0] = token;
  }
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
  var normalModeHandler = (e) => {
    const token = normalizeKeyToken(e, rbSize === 0);
    if (!token) return false;
    rbPush(token);
    let result = attemptMatchFromRing();
    switch (result.type) {
      case "exact": {
        clearSeqTimer();
        resetSeqState();
        if (result.hasChildren) {
          startSequenceWait(SEQUENCE_STATE.PENDING_EXACT, result.handler);
          return true;
        }
        try {
          result.handler(e);
        } catch (_) {
        }
        rbClear();
        return true;
      }
      case "prefix": {
        const lastExact = result.lastExact;
        startSequenceWait(SEQUENCE_STATE.PREFIX, lastExact?.handler || null);
        return true;
      }
      case "none":
      default:
        break;
    }
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
        try {
          result.handler(e);
        } catch (_) {
        }
        rbClear();
        return true;
      }
      case "prefix": {
        startSequenceWait(SEQUENCE_STATE.PREFIX, null);
        return true;
      }
      case "none":
      default:
        break;
    }
    clearSeqTimer();
    resetSeqState();
    rbClear();
    return false;
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
        break;
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
    let __vimDisplayLoaded = false;
    let __vimDisplayModPromise = null;
    const loadVimDisplay = async () => {
      if (__vimDisplayLoaded) return __vimDisplayModPromise;
      if (!__vimDisplayModPromise) {
        const url = globalThis.chrome && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL("js/dist/vim_display.js") : "/js/dist/vim_display.js";
        __vimDisplayModPromise = import(url).then((mod) => {
          try {
            mod.initVimDisplay?.();
          } catch (_) {
          }
          __vimDisplayLoaded = true;
          return mod;
        });
      }
      return __vimDisplayModPromise;
    };
    const syncOnKeydown = () => {
      loadVimDisplay().then((m) => m.syncVimDisplay?.(currentVimMode));
    };
    const syncOnClick = () => {
      loadVimDisplay().then((m) => m.syncVimDisplay?.(currentVimMode));
    };
    document.addEventListener("keydown", syncOnKeydown, { capture: false });
    document.addEventListener("click", syncOnClick, { capture: false });
    chrome.runtime.onMessage.addListener(async (msg) => {
      if (msg?.action === "cleanup") {
        document.removeEventListener("keydown", handleKeydown, { capture: true });
        document.removeEventListener("click", handleClick, { capture: true });
        document.removeEventListener("keydown", syncOnKeydown, { capture: false });
        document.removeEventListener("click", syncOnClick, { capture: false });
        if (__vimDisplayLoaded) {
          __vimDisplayModPromise?.then((m) => m.cleanupVimDisplay?.());
        }
      }
    });
  }
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3ZpbV9tb2RlLmpzIiwgIi4uL3NyYy9tYWluLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgbGV0IGN1cnJlbnRWaW1Nb2RlID0gXCJub3JtYWxcIjtcblxuLy8gPT09PT09PT09PT09IFBSSVZBVEUgVkFSSUFCTEUgPT09PT09PT09PT09PT09XG5jb25zdCBWSU1fTU9ERVMgPSB7XG4gIE5PUk1BTDogXCJub3JtYWxcIixcbiAgSU5TRVJUOiBcImluc2VydFwiLFxuICBWSVNVQUw6IFwidmlzdWFsXCIsXG59O1xuXG5jb25zdCBTQ1JPTExfU1RFUCA9IDgwO1xuY29uc3QgQVVUT19TQ1JPTExfRUFTRSA9IDEwO1xuXG5jb25zdCBWSU1fQ09NTUFORFMgPSB7XG4gIGltbWVkaWF0ZTogW1xuICAgIHtcbiAgICAgIGtleTogXCJpXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiRW50ZXIgaW5zZXJ0IG1vZGVcIixcbiAgICAgIGhhbmRsZXI6ICgpID0+IHtcbiAgICAgICAgY3VycmVudFZpbU1vZGUgPSBWSU1fTU9ERVMuSU5TRVJUO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwiaFwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlNjcm9sbCBsZWZ0XCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGlzUmVwZWF0ID0gISFldnQ/LnJlcGVhdDtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0XG4gICAgICAgICAgPyBNYXRoLm1heCgxLCBTQ1JPTExfU1RFUCAtIEFVVE9fU0NST0xMX0VBU0UpXG4gICAgICAgICAgOiBTQ1JPTExfU1RFUDtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgbGVmdDogLXN0ZXAsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwialwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlNjcm9sbCBkb3duXCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGlzUmVwZWF0ID0gISFldnQ/LnJlcGVhdDtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0XG4gICAgICAgICAgPyBNYXRoLm1heCgxLCBTQ1JPTExfU1RFUCAtIEFVVE9fU0NST0xMX0VBU0UpXG4gICAgICAgICAgOiBTQ1JPTExfU1RFUDtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgdG9wOiBzdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcImtcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJTY3JvbGwgdXBcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBzdGVwID0gaXNSZXBlYXRcbiAgICAgICAgICA/IE1hdGgubWF4KDEsIFNDUk9MTF9TVEVQIC0gQVVUT19TQ1JPTExfRUFTRSlcbiAgICAgICAgICA6IFNDUk9MTF9TVEVQO1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGlzUmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoeyB0b3A6IC1zdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcImxcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJTY3JvbGwgcmlnaHRcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBzdGVwID0gaXNSZXBlYXRcbiAgICAgICAgICA/IE1hdGgubWF4KDEsIFNDUk9MTF9TVEVQIC0gQVVUT19TQ1JPTExfRUFTRSlcbiAgICAgICAgICA6IFNDUk9MTF9TVEVQO1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGlzUmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoeyBsZWZ0OiBzdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcIkMtalwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkN0cmwrSiBleGFtcGxlXCIsXG4gICAgICBoYW5kbGVyOiAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXhlY3V0ZSBDdHJsICsgalwiKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBbXCJDLWpcIiwgXCJqXCJdLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkRlbW86IEN0cmwrSiB0aGVuIGpcIixcbiAgICAgIGhhbmRsZXI6ICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFeGVjdXRlIEN0cmwgKyBqLCB0aGVuIGpcIik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogW1wiQy1qXCIsIFwia1wiXSxcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJEZW1vOiBDdHJsK0ogdGhlbiBDdHJsK0tcIixcbiAgICAgIGhhbmRsZXI6ICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFeGVjdXRlIEN0cmwgKyBqLCB0aGVuIGtcIik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogXCJDLWRcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJQYWdlIGRvd25cIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBwYWdlID0gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcih3aW5kb3cuaW5uZXJIZWlnaHQgKiAwLjkpKTtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0ID8gTWF0aC5tYXgoMSwgcGFnZSAtIEFVVE9fU0NST0xMX0VBU0UpIDogcGFnZTtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgdG9wOiBzdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcIkMtdVwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlBhZ2UgdXBcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBwYWdlID0gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcih3aW5kb3cuaW5uZXJIZWlnaHQgKiAwLjkpKTtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0ID8gTWF0aC5tYXgoMSwgcGFnZSAtIEFVVE9fU0NST0xMX0VBU0UpIDogcGFnZTtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgdG9wOiAtc3RlcCwgYmVoYXZpb3IgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogXCJnZ1wiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkdvIHRvIHRvcCBvZiBkb2N1bWVudFwiLFxuICAgICAgaGFuZGxlcjogKGV2dCkgPT4ge1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGV2dD8ucmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsVG8oeyB0b3A6IDAsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwiUy1nXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiR28gdG8gYm90dG9tIG9mIGRvY3VtZW50XCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGJlaGF2aW9yID0gZXZ0Py5yZXBlYXQgPyBcImF1dG9cIiA6IFwic21vb3RoXCI7XG4gICAgICAgIGNvbnN0IGRvYyA9XG4gICAgICAgICAgZG9jdW1lbnQuc2Nyb2xsaW5nRWxlbWVudCB8fFxuICAgICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCB8fFxuICAgICAgICAgIGRvY3VtZW50LmJvZHk7XG4gICAgICAgIHdpbmRvdy5zY3JvbGxUbyh7IHRvcDogZG9jLnNjcm9sbEhlaWdodCwgYmVoYXZpb3IgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICBdLFxufTtcblxuLy8gU2VxdWVuY2Ugc3RhdGUgZW51bSBmb3IgbWFpbnRhaW5hYmlsaXR5XG5jb25zdCBTRVFVRU5DRV9TVEFURSA9IHtcbiAgSURMRTogXCJpZGxlXCIsXG4gIFBSRUZJWDogXCJwcmVmaXhcIixcbiAgUEVORElOR19FWEFDVDogXCJwZW5kaW5nRXhhY3RcIixcbn07XG5cbi8vIFNlcXVlbmNlIG1hdGNoaW5nIHN0YXRlIChwcmVmaXggdHJpZSBiYXNlZClcbi8vIFVzZSBhIHRpbnkgcmluZyBidWZmZXIgdG8gYXZvaWQgYWxsb2NhdGlvbnMgYW5kIHNoaWZ0cy5cbmxldCBSQl9DQVAgPSAyOyAvLyB3aWxsIGJlIHNldCBmcm9tIE1BWF9TRVFfTEVOIGFmdGVyIHRyaWUgYnVpbGRcbmxldCByYiA9IG5ldyBBcnJheSgyKTtcbmxldCByYlN0YXJ0ID0gMDsgLy8gaW5kZXggb2Ygb2xkZXN0XG5sZXQgcmJTaXplID0gMDsgIC8vIG51bWJlciBvZiB2YWxpZCB0b2tlbnNcbmNvbnN0IFRJTUVPVVQgPSA1MDA7XG4vLyBTaW5nbGUgc2VxdWVuY2UgdGltZXIvc3RhdGUgKHVuaWZpZXMgcHJlZml4IGFuZCBwZW5kaW5nLWV4YWN0IHRpbWVycylcbmxldCBzZXFUaW1lcklkID0gbnVsbDsgLy8gbnVtYmVyIHwgbnVsbFxubGV0IHNlcVN0YXRlID0gU0VRVUVOQ0VfU1RBVEUuSURMRTsgLy8gc2VlIFNFUVVFTkNFX1NUQVRFXG5sZXQgc2VxSGFuZGxlciA9IG51bGw7IC8vIGZ1bmN0aW9uIHwgbnVsbCAobGFzdEV4YWN0IGZvciBwcmVmaXgsIGV4YWN0IGZvciBwZW5kaW5nRXhhY3QpXG5cbi8vIFNlcXVlbmNlIHN0YXRlIG1hY2hpbmUgaGVscGVyc1xuLy8gU2VlIFJFQURNRS5tZCBmb3IgdGhlIE1lcm1haWQgZGlhZ3JhbSBvZiB0aGVzZSBzdGF0ZXMgYW5kIHRyYW5zaXRpb25zLlxuZnVuY3Rpb24gY2xlYXJTZXFUaW1lcigpIHtcbiAgaWYgKHNlcVRpbWVySWQpIHtcbiAgICBjbGVhclRpbWVvdXQoc2VxVGltZXJJZCk7XG4gICAgc2VxVGltZXJJZCA9IG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVzZXRTZXFTdGF0ZSgpIHtcbiAgc2VxU3RhdGUgPSBTRVFVRU5DRV9TVEFURS5JRExFO1xuICBzZXFIYW5kbGVyID0gbnVsbDtcbn1cblxuLy8gU3RhcnQgYSB1bmlmaWVkIHRpbWVvdXQgd2luZG93IGZvciBlaXRoZXIgUFJFRklYIG9yIFBFTkRJTkdfRVhBQ1Rcbi8vIElmIGEgaGFuZGxlciBpcyBwcm92aWRlZCwgaXQgd2lsbCBydW4gb24gdGltZW91dCAoZS5nLiwgbGFzdEV4YWN0IGZvciBQUkVGSVgsIGV4YWN0IGZvciBQRU5ESU5HX0VYQUNUKVxuZnVuY3Rpb24gc3RhcnRTZXF1ZW5jZVdhaXQoc3RhdGUsIGhhbmRsZXIpIHtcbiAgY2xlYXJTZXFUaW1lcigpO1xuICBzZXFTdGF0ZSA9IHN0YXRlO1xuICBzZXFIYW5kbGVyID0gaGFuZGxlciB8fCBudWxsO1xuICBzZXFUaW1lcklkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgLy8gT25seSBmaXJlIGlmIHdlJ3JlIHN0aWxsIGluIHRoZSBzYW1lIHN0YXRlIChubyBpbnRlcmZlcmVuY2UgZnJvbSBuZXcga2V5cylcbiAgICBpZiAoc2VxU3RhdGUgPT09IHN0YXRlICYmIHNlcUhhbmRsZXIpIHtcbiAgICAgIHRyeSB7IHNlcUhhbmRsZXIoKTsgfSBjYXRjaCAoXykge31cbiAgICB9XG4gICAgcmJDbGVhcigpO1xuICAgIHJlc2V0U2VxU3RhdGUoKTtcbiAgICBjbGVhclNlcVRpbWVyKCk7XG4gIH0sIFRJTUVPVVQpO1xufVxuXG4vLyBJZiB3ZSB3ZXJlIGRlZmVycmluZyBhbiBleGFjdCAoUEVORElOR19FWEFDVCksIGZsdXNoIGl0IGltbWVkaWF0ZWx5IChvbiBkaXZlcmdlbmNlKVxuZnVuY3Rpb24gZmx1c2hQZW5kaW5nSWZBbnkoKSB7XG4gIGlmIChzZXFTdGF0ZSA9PT0gU0VRVUVOQ0VfU1RBVEUuUEVORElOR19FWEFDVCAmJiBzZXFIYW5kbGVyKSB7XG4gICAgY29uc3QgaGFuZGxlciA9IHNlcUhhbmRsZXI7XG4gICAgY2xlYXJTZXFUaW1lcigpO1xuICAgIHJlc2V0U2VxU3RhdGUoKTtcbiAgICB0cnkgeyBoYW5kbGVyKCk7IH0gY2F0Y2ggKF8pIHt9XG4gIH1cbn1cblxuLy8gQnVpbGQgYSB0aW55IHByZWZpeCB0cmllIGZvciBmYXN0IG1hdGNoaW5nXG5mdW5jdGlvbiBjb21tYW5kS2V5VG9Ub2tlbnMoa2V5KSB7XG4gIC8vIEFsbG93IGFycmF5IGZvcm0gZGlyZWN0bHksIGUuZy4sIFtcIkMtalwiLCBcImpcIl1cbiAgaWYgKEFycmF5LmlzQXJyYXkoa2V5KSkgcmV0dXJuIGtleS5zbGljZSgpO1xuICBjb25zdCBrZXlTdHIgPSBTdHJpbmcoa2V5KTtcbiAgLy8gU3BhY2UtZGVsaW1pdGVkIHRva2VucywgZS5nLiwgXCJDLWogalwiID0+IFtcIkMtalwiLFwialwiXVxuICBpZiAoa2V5U3RyLmluY2x1ZGVzKFwiIFwiKSkgcmV0dXJuIGtleVN0ci50cmltKCkuc3BsaXQoL1xccysvKTtcblxuICAvLyBIeXBoZW4gaGFuZGxpbmc6IHRyZWF0IGxlYWRpbmcgbW9kaWZpZXJzIChDLCBTKSBhcyBwYXJ0IG9mIGZpcnN0IHRva2VuIG9ubHkuXG4gIC8vIEV4YW1wbGU6IFwiQy1qLWpcIiA9PiBbXCJDLWpcIiwgXCJqXCJdIDsgXCJDLVMtai1nXCIgPT4gW1wiQy1TLWpcIiwgXCJnXCJdXG4gIGlmIChrZXlTdHIuaW5jbHVkZXMoXCItXCIpKSB7XG4gICAgY29uc3Qgc2VncyA9IGtleVN0ci5zcGxpdChcIi1cIik7XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IG1vZHMgPSBbXTtcbiAgICB3aGlsZSAoaSA8IHNlZ3MubGVuZ3RoICYmIChzZWdzW2ldID09PSBcIkNcIiB8fCBzZWdzW2ldID09PSBcIlNcIikpIHtcbiAgICAgIG1vZHMucHVzaChzZWdzW2ldKTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgaWYgKGkgPCBzZWdzLmxlbmd0aCkge1xuICAgICAgY29uc3QgYmFzZSA9IHNlZ3NbaSsrXTtcbiAgICAgIGNvbnN0IGZpcnN0ID0gKG1vZHMubGVuZ3RoID8gbW9kcy5qb2luKFwiLVwiKSArIFwiLVwiIDogXCJcIikgKyBiYXNlO1xuICAgICAgY29uc3QgcmVzdCA9IHNlZ3Muc2xpY2UoaSk7XG4gICAgICByZXR1cm4gW2ZpcnN0LCAuLi5yZXN0XTtcbiAgICB9XG4gICAgcmV0dXJuIFtrZXlTdHJdO1xuICB9XG5cbiAgLy8gRmFsbGJhY2s6IHNwbGl0IGludG8gaW5kaXZpZHVhbCBjaGFyYWN0ZXJzIChlLmcuLCBcImdnXCIgPT4gW1wiZ1wiLFwiZ1wiXSkuXG4gIHJldHVybiBrZXlTdHIuc3BsaXQoXCJcIik7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkQ29tbWFuZFRyaWUoY29tbWFuZHMpIHtcbiAgY29uc3Qgcm9vdCA9IHsgY2hpbGRyZW46IG5ldyBNYXAoKSwgaGFuZGxlcjogbnVsbCB9O1xuICBsZXQgbWF4TGVuID0gMTtcbiAgZm9yIChjb25zdCBjbWQgb2YgY29tbWFuZHMpIHtcbiAgICBjb25zdCB0b2tlbnMgPSBjb21tYW5kS2V5VG9Ub2tlbnMoY21kLmtleSk7XG4gICAgbWF4TGVuID0gTWF0aC5tYXgobWF4TGVuLCB0b2tlbnMubGVuZ3RoKTtcbiAgICBsZXQgbm9kZSA9IHJvb3Q7XG4gICAgZm9yIChjb25zdCB0IG9mIHRva2Vucykge1xuICAgICAgaWYgKCFub2RlLmNoaWxkcmVuLmhhcyh0KSlcbiAgICAgICAgbm9kZS5jaGlsZHJlbi5zZXQodCwgeyBjaGlsZHJlbjogbmV3IE1hcCgpLCBoYW5kbGVyOiBudWxsIH0pO1xuICAgICAgbm9kZSA9IG5vZGUuY2hpbGRyZW4uZ2V0KHQpO1xuICAgIH1cbiAgICAvLyBMYXN0IHRva2VuOiBzdG9yZSBoYW5kbGVyXG4gICAgbm9kZS5oYW5kbGVyID0gY21kLmhhbmRsZXI7XG4gIH1cbiAgcmV0dXJuIHsgcm9vdCwgbWF4TGVuIH07XG59XG5cbmNvbnN0IHsgcm9vdDogQ09NTUFORF9UUklFLCBtYXhMZW46IE1BWF9TRVFfTEVOIH0gPSBidWlsZENvbW1hbmRUcmllKFxuICBWSU1fQ09NTUFORFMuaW1tZWRpYXRlLFxuKTtcbi8vIEluaXRpYWxpemUgcmluZyBidWZmZXIgY2FwYWNpdHkgZnJvbSBjb21wdXRlZCBtYXggbGVuZ3RoIChtaW4gMSlcblJCX0NBUCA9IE1hdGgubWF4KDEsIE1BWF9TRVFfTEVOKTtcbnJiID0gbmV3IEFycmF5KFJCX0NBUCk7XG5cbi8vID09PT09PT09PT09PSBQUklWQVRFIGZ1bmN0aW9uID09PT09PT09PT09PT09PVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbnB1dEZpZWxkKGVsZW1lbnQpIHtcbiAgcmV0dXJuIChcbiAgICBlbGVtZW50ICYmXG4gICAgKGVsZW1lbnQudGFnTmFtZSA9PT0gXCJJTlBVVFwiIHx8XG4gICAgICBlbGVtZW50LnRhZ05hbWUgPT09IFwiVEVYVEFSRUFcIiB8fFxuICAgICAgZWxlbWVudC5pc0NvbnRlbnRFZGl0YWJsZSlcbiAgKTtcbn1cblxuLy8gTm9ybWFsaXplIGEga2V5IGV2ZW50IGludG8gYSB0b2tlbiB0aGF0IGluY2x1ZGVzIEN0cmwvU2hpZnQgd2hlbiBwcmVzZW50LlxuLy8gQ2FsbGVyIHByZS1jb21wdXRlcyB3aGV0aGVyIHRoaXMgaXMgdGhlIGZpcnN0IHRva2VuIGluIHRoZSBzZXF1ZW5jZSBmb3IgcGVyZi5cbi8vIEV4YW1wbGVzOiBcImpcIiwgXCJDLWpcIiwgXCJTLWpcIiwgXCJDLVMtalwiLCBcIlMtQXJyb3dEb3duXCJcbmZ1bmN0aW9uIG5vcm1hbGl6ZUtleVRva2VuKGUsIGlzRmlyc3QpIHtcbiAgY29uc3QgayA9IGUua2V5O1xuXG4gIC8vIElnbm9yZSBzdGFuZGFsb25lIG1vZGlmaWVyIGtleXNcbiAgaWYgKGsgPT09IFwiU2hpZnRcIiB8fCBrID09PSBcIkNvbnRyb2xcIiB8fCBrID09PSBcIkFsdFwiIHx8IGsgPT09IFwiTWV0YVwiKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBCYXNlIGtleSAobG93ZXJjYXNlZCBmb3IgbGV0dGVycyB0byBrZWVwIHRva2VucyBjb25zaXN0ZW50KVxuICBsZXQgYmFzZSA9IGsubGVuZ3RoID09PSAxID8gay50b0xvd2VyQ2FzZSgpIDogaztcblxuICAvLyBGYXN0IHBhdGg6IG5vbi1maXJzdCB0b2tlbnMgaWdub3JlIG1vZGlmaWVycyAoa2VlcHMgc2VxdWVuY2VzIHNtb290aClcbiAgaWYgKCFpc0ZpcnN0KSByZXR1cm4gYmFzZTtcblxuICAvLyBPbmx5IGVuY29kZSBtb2RpZmllcnMgb24gdGhlIEZJUlNUIHRva2VuIG9mIGEgc2VxdWVuY2VcbiAgY29uc3QgbW9kcyA9IFtdO1xuICBpZiAoZS5jdHJsS2V5KSBtb2RzLnB1c2goXCJDXCIpO1xuICBpZiAoZS5zaGlmdEtleSkgbW9kcy5wdXNoKFwiU1wiKTtcbiAgcmV0dXJuIG1vZHMubGVuZ3RoID8gbW9kcy5qb2luKFwiLVwiKSArIFwiLVwiICsgYmFzZSA6IGJhc2U7XG59XG5cbi8vIEhlbHBlcjogcmluZyBidWZmZXIgb3BlcmF0aW9uc1xuZnVuY3Rpb24gcmJDbGVhcigpIHtcbiAgcmJTdGFydCA9IDA7IHJiU2l6ZSA9IDA7XG59XG5mdW5jdGlvbiByYlB1c2godG9rZW4pIHtcbiAgaWYgKHJiU2l6ZSA8IFJCX0NBUCkge1xuICAgIHJiWyhyYlN0YXJ0ICsgcmJTaXplKSAlIFJCX0NBUF0gPSB0b2tlbjtcbiAgICByYlNpemUrKztcbiAgfSBlbHNlIHtcbiAgICAvLyBvdmVyd3JpdGUgb2xkZXN0XG4gICAgcmJbcmJTdGFydF0gPSB0b2tlbjtcbiAgICByYlN0YXJ0ID0gKHJiU3RhcnQgKyAxKSAlIFJCX0NBUDtcbiAgfVxufVxuZnVuY3Rpb24gcmJTZXRMYXRlc3QodG9rZW4pIHtcbiAgcmJTdGFydCA9IDA7IHJiU2l6ZSA9IDE7IHJiWzBdID0gdG9rZW47XG59XG5cbi8vIEF0dGVtcHQgdG8gbWF0Y2ggdG9rZW5zIGN1cnJlbnRseSBpbiByaW5nIGJ1ZmZlclxuZnVuY3Rpb24gYXR0ZW1wdE1hdGNoRnJvbVJpbmcoKSB7XG4gIGxldCBub2RlID0gQ09NTUFORF9UUklFO1xuICBsZXQgbGFzdEV4YWN0ID0gbnVsbDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCByYlNpemU7IGkrKykge1xuICAgIGNvbnN0IHQgPSByYlsocmJTdGFydCArIGkpICUgUkJfQ0FQXTtcbiAgICBjb25zdCBuZXh0ID0gbm9kZS5jaGlsZHJlbi5nZXQodCk7XG4gICAgaWYgKCFuZXh0KSB7XG4gICAgICByZXR1cm4geyB0eXBlOiBcIm5vbmVcIiwgbGFzdEV4YWN0IH07XG4gICAgfVxuICAgIG5vZGUgPSBuZXh0O1xuICAgIGlmIChub2RlLmhhbmRsZXIpIGxhc3RFeGFjdCA9IHsgaGFuZGxlcjogbm9kZS5oYW5kbGVyLCBkZXB0aDogaSArIDEgfTtcbiAgfVxuICBpZiAobm9kZS5oYW5kbGVyKSByZXR1cm4geyB0eXBlOiBcImV4YWN0XCIsIGhhbmRsZXI6IG5vZGUuaGFuZGxlciwgaGFzQ2hpbGRyZW46IG5vZGUuY2hpbGRyZW4uc2l6ZSA+IDAgfTtcbiAgaWYgKG5vZGUuY2hpbGRyZW4uc2l6ZSA+IDApIHJldHVybiB7IHR5cGU6IFwicHJlZml4XCIsIGxhc3RFeGFjdCB9O1xuICByZXR1cm4geyB0eXBlOiBcIm5vbmVcIiwgbGFzdEV4YWN0IH07XG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUga2V5IHdhcyBoYW5kbGVkIChleGFjdCBvciBwcmVmaXggbWF0Y2gpLCBmYWxzZSBvdGhlcndpc2VcbmNvbnN0IG5vcm1hbE1vZGVIYW5kbGVyID0gKGUpID0+IHtcbiAgLy8gUHJlLWNvbXB1dGUgXCJpcyBmaXJzdCB0b2tlblwiIHNvIG5vcm1hbGl6ZXIgY2FuIHRha2UgdGhlIGZhc3QgcGF0aFxuICBjb25zdCB0b2tlbiA9IG5vcm1hbGl6ZUtleVRva2VuKGUsIHJiU2l6ZSA9PT0gMCk7XG4gIGlmICghdG9rZW4pIHJldHVybiBmYWxzZTsgLy8gaWdub3JlZCAocHVyZSBtb2RpZmllcilcblxuICAvLyBBcHBlbmQgdG9rZW4gKHJpbmcgYnVmZmVyKVxuICByYlB1c2godG9rZW4pO1xuXG4gIC8vIFRyeSB0byBtYXRjaCB0aGUgY3VycmVudCBidWZmZXJcbiAgbGV0IHJlc3VsdCA9IGF0dGVtcHRNYXRjaEZyb21SaW5nKCk7XG5cbiAgc3dpdGNoIChyZXN1bHQudHlwZSkge1xuICAgIGNhc2UgXCJleGFjdFwiOiB7XG4gICAgICAvLyBDbGVhciBhbnkgZXhpc3Rpbmcgc2VxdWVuY2UgdGltZXIgYW5kIHJlc2V0IHN0YXRlXG4gICAgICBjbGVhclNlcVRpbWVyKCk7XG4gICAgICByZXNldFNlcVN0YXRlKCk7XG4gICAgICBpZiAocmVzdWx0Lmhhc0NoaWxkcmVuKSB7XG4gICAgICAgIHN0YXJ0U2VxdWVuY2VXYWl0KFNFUVVFTkNFX1NUQVRFLlBFTkRJTkdfRVhBQ1QsIHJlc3VsdC5oYW5kbGVyKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICB0cnkgeyByZXN1bHQuaGFuZGxlcihlKTsgfSBjYXRjaCAoXykge31cbiAgICAgIHJiQ2xlYXIoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjYXNlIFwicHJlZml4XCI6IHtcbiAgICAgIGNvbnN0IGxhc3RFeGFjdCA9IHJlc3VsdC5sYXN0RXhhY3Q7IC8vIG1heSBiZSBudWxsXG4gICAgICBzdGFydFNlcXVlbmNlV2FpdChTRVFVRU5DRV9TVEFURS5QUkVGSVgsIGxhc3RFeGFjdD8uaGFuZGxlciB8fCBudWxsKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjYXNlIFwibm9uZVwiOlxuICAgIGRlZmF1bHQ6XG4gICAgICAvLyBmYWxsIHRocm91Z2ggdG8gZGl2ZXJnZW5jZSBoYW5kbGluZ1xuICAgICAgYnJlYWs7XG4gIH1cblxuICAvLyBObyBtYXRjaCB3aXRoIGN1cnJlbnQgYnVmZmVyOyB0cnkgd2l0aCBvbmx5IHRoZSBsYXRlc3QgdG9rZW5cbiAgLy8gSWYgd2UgaGFkIGEgcGVuZGluZyBleGFjdCB3YWl0aW5nIGZvciBjb250aW51YXRpb24sIGZsdXNoIGl0IGltbWVkaWF0ZWx5IG9uIGRpdmVyZ2VuY2VcbiAgZmx1c2hQZW5kaW5nSWZBbnkoKTtcblxuICByYlNldExhdGVzdCh0b2tlbik7XG4gIHJlc3VsdCA9IGF0dGVtcHRNYXRjaEZyb21SaW5nKCk7XG4gIHN3aXRjaCAocmVzdWx0LnR5cGUpIHtcbiAgICBjYXNlIFwiZXhhY3RcIjoge1xuICAgICAgY2xlYXJTZXFUaW1lcigpO1xuICAgICAgcmVzZXRTZXFTdGF0ZSgpO1xuICAgICAgaWYgKHJlc3VsdC5oYXNDaGlsZHJlbikge1xuICAgICAgICBzdGFydFNlcXVlbmNlV2FpdChTRVFVRU5DRV9TVEFURS5QRU5ESU5HX0VYQUNULCByZXN1bHQuaGFuZGxlcik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgdHJ5IHsgcmVzdWx0LmhhbmRsZXIoZSk7IH0gY2F0Y2ggKF8pIHt9XG4gICAgICByYkNsZWFyKCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY2FzZSBcInByZWZpeFwiOiB7XG4gICAgICBzdGFydFNlcXVlbmNlV2FpdChTRVFVRU5DRV9TVEFURS5QUkVGSVgsIG51bGwpOyAvLyBubyBzaG9ydGVyIGV4YWN0IGtub3duIGhlcmVcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjYXNlIFwibm9uZVwiOlxuICAgIGRlZmF1bHQ6XG4gICAgICBicmVhaztcbiAgfVxuXG4gIC8vIFN0aWxsIG5vIG1hdGNoXG4gIGNsZWFyU2VxVGltZXIoKTtcbiAgcmVzZXRTZXFTdGF0ZSgpO1xuICByYkNsZWFyKCk7XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmNvbnN0IGluc2VydE1vZGVIYW5kbGVyID0gKGUpID0+IHtcbiAgaWYgKGUua2V5ID09PSBcIkVzY2FwZVwiKSB7XG4gICAgY3VycmVudFZpbU1vZGUgPSBWSU1fTU9ERVMuTk9STUFMO1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZUtleWRvd24gPSAoZSkgPT4ge1xuICBzd2l0Y2ggKGN1cnJlbnRWaW1Nb2RlKSB7XG4gICAgY2FzZSBWSU1fTU9ERVMuTk9STUFMOiB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAvLyBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgLy8gZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgIG5vcm1hbE1vZGVIYW5kbGVyKGUpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNhc2UgVklNX01PREVTLklOU0VSVDpcbiAgICAgIGluc2VydE1vZGVIYW5kbGVyKGUpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUud2FybihcIlVuZXhwZWN0ZWQgbW9kZTpcIiwgY3VycmVudFZpbU1vZGUpO1xuICAgICAgYnJlYWs7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVDbGljayA9IChlKSA9PiB7XG4gIHN3aXRjaCAoY3VycmVudFZpbU1vZGUpIHtcbiAgICBjYXNlIFZJTV9NT0RFUy5OT1JNQUw6IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0O1xuICAgICAgaWYgKGlzSW5wdXRGaWVsZCh0YXJnZXQpKSB7XG4gICAgICAgIGN1cnJlbnRWaW1Nb2RlID0gVklNX01PREVTLklOU0VSVDtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjYXNlIFZJTV9NT0RFUy5JTlNFUlQ6XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS53YXJuKFwiVW5leHBlY3RlZCBtb2RlOlwiLCBjdXJyZW50VmltTW9kZSk7XG4gICAgICBicmVhaztcbiAgfVxufTtcbiIsICIvLyBUaW55LCBpZGVtcG90ZW50IGJvb3RzdHJhcCB0aGF0IGxhenktbG9hZHMgRE9NIGxvZ2ljIG9uIGZpcnN0IHVzZS5cbmltcG9ydCB7IGhhbmRsZUtleWRvd24sIGhhbmRsZUNsaWNrLCBjdXJyZW50VmltTW9kZSB9IGZyb20gXCIuL3ZpbV9tb2RlLmpzXCI7XG5cbmNvbnN0IEJPT1RTVFJBUF9GTEFHID0gXCJfX3dlcl9ib290c3RyYXBfaW5zdGFsbGVkXCI7XG5cbi8vIFByZXZlbnQgZHVwbGljYXRlIGluc3RhbGxzIChTUEFzLCBiZmNhY2hlLCByZS1pbmplY3Rpb24pXG5pZiAoIWdsb2JhbFRoaXNbQk9PVFNUUkFQX0ZMQUddKSB7XG4gIGdsb2JhbFRoaXNbQk9PVFNUUkFQX0ZMQUddID0gdHJ1ZTtcbiAgY29uc29sZS5sb2coXCJEZWZhdWx0IG1vZGU6IFwiICsgY3VycmVudFZpbU1vZGUpO1xuXG4gIC8vIFZpbSBrZXlkb3duIGhhbmRsZXIgaXMgaW1wb3J0ZWQgZnJvbSB2aW1fbW9kZS5qc1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBoYW5kbGVLZXlkb3duLCB7IGNhcHR1cmU6IHRydWUgfSk7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBoYW5kbGVDbGljaywgeyBjYXB0dXJlOiB0cnVlIH0pO1xuXG4gIC8vIExhenktbG9hZCB2aW1fZGlzcGxheSBhZnRlciBmaXJzdCBpbnRlcmFjdGlvbiwgdGhlbiBrZWVwIGl0IGluIHN5bmNcbiAgbGV0IF9fdmltRGlzcGxheUxvYWRlZCA9IGZhbHNlO1xuICBsZXQgX192aW1EaXNwbGF5TW9kUHJvbWlzZSA9IG51bGw7XG4gIGNvbnN0IGxvYWRWaW1EaXNwbGF5ID0gYXN5bmMgKCkgPT4ge1xuICAgIGlmIChfX3ZpbURpc3BsYXlMb2FkZWQpIHJldHVybiBfX3ZpbURpc3BsYXlNb2RQcm9taXNlO1xuICAgIGlmICghX192aW1EaXNwbGF5TW9kUHJvbWlzZSkge1xuICAgICAgY29uc3QgdXJsID0gKGdsb2JhbFRoaXMuY2hyb21lICYmIGNocm9tZS5ydW50aW1lICYmIGNocm9tZS5ydW50aW1lLmdldFVSTClcbiAgICAgICAgPyBjaHJvbWUucnVudGltZS5nZXRVUkwoXCJqcy9kaXN0L3ZpbV9kaXNwbGF5LmpzXCIpXG4gICAgICAgIDogXCIvanMvZGlzdC92aW1fZGlzcGxheS5qc1wiOyAvLyBmYWxsYmFjayBwYXRoIGZvciBkZXYgc3RhdGljIHNlcnZpbmdcbiAgICAgIF9fdmltRGlzcGxheU1vZFByb21pc2UgPSBpbXBvcnQodXJsKS50aGVuKChtb2QpID0+IHtcbiAgICAgICAgdHJ5IHsgbW9kLmluaXRWaW1EaXNwbGF5Py4oKTsgfSBjYXRjaCAoXykge31cbiAgICAgICAgX192aW1EaXNwbGF5TG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIG1vZDtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gX192aW1EaXNwbGF5TW9kUHJvbWlzZTtcbiAgfTtcblxuICAvLyBVcGRhdGUgQUZURVIgdmltIGhhbmRsZXJzIHJ1biAoYnViYmxlIHBoYXNlKS4gVHJpZ2dlcnMgbGF6eSBsb2FkIG9uIGZpcnN0IGV2ZW50LlxuICBjb25zdCBzeW5jT25LZXlkb3duID0gKCkgPT4geyBsb2FkVmltRGlzcGxheSgpLnRoZW4oKG0pID0+IG0uc3luY1ZpbURpc3BsYXk/LihjdXJyZW50VmltTW9kZSkpOyB9O1xuICBjb25zdCBzeW5jT25DbGljayA9ICgpID0+IHsgbG9hZFZpbURpc3BsYXkoKS50aGVuKChtKSA9PiBtLnN5bmNWaW1EaXNwbGF5Py4oY3VycmVudFZpbU1vZGUpKTsgfTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgc3luY09uS2V5ZG93biwgeyBjYXB0dXJlOiBmYWxzZSB9KTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHN5bmNPbkNsaWNrLCB7IGNhcHR1cmU6IGZhbHNlIH0pO1xuXG4gIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihhc3luYyAobXNnKSA9PiB7XG4gICAgaWYgKG1zZz8uYWN0aW9uID09PSBcImNsZWFudXBcIikge1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgaGFuZGxlS2V5ZG93biwgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhhbmRsZUNsaWNrLCB7IGNhcHR1cmU6IHRydWUgfSk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBzeW5jT25LZXlkb3duLCB7IGNhcHR1cmU6IGZhbHNlIH0pO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHN5bmNPbkNsaWNrLCB7IGNhcHR1cmU6IGZhbHNlIH0pO1xuICAgICAgLy8gQ2xlYW4gdXAgdGhlIFVJIGlmIGl0IHdhcyBsb2FkZWRcbiAgICAgIGlmIChfX3ZpbURpc3BsYXlMb2FkZWQpIHtcbiAgICAgICAgX192aW1EaXNwbGF5TW9kUHJvbWlzZT8udGhlbigobSkgPT4gbS5jbGVhbnVwVmltRGlzcGxheT8uKCkpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOztBQUFPLE1BQUksaUJBQWlCO0FBRzVCLE1BQU0sWUFBWTtBQUFBLElBQ2hCLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQSxFQUNWO0FBRUEsTUFBTSxjQUFjO0FBQ3BCLE1BQU0sbUJBQW1CO0FBRXpCLE1BQU0sZUFBZTtBQUFBLElBQ25CLFdBQVc7QUFBQSxNQUNUO0FBQUEsUUFDRSxLQUFLO0FBQUEsUUFDTCxNQUFNO0FBQUEsUUFDTixhQUFhO0FBQUEsUUFDYixTQUFTLE1BQU07QUFDYiwyQkFBaUIsVUFBVTtBQUMzQixpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsTUFDQTtBQUFBLFFBQ0UsS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sYUFBYTtB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
