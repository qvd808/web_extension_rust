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
  var __searchLoaded = false;
  var __searchModPromise = null;
  function loadSearchUI() {
    if (__searchLoaded) return __searchModPromise;
    if (!__searchModPromise) {
      const url = globalThis.chrome && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL("js/dist/search_ui.js") : "/js/dist/search_ui.js";
      __searchModPromise = import(url).then((mod) => {
        try {
          mod.initSearchUI?.();
        } catch (_) {
        }
        __searchLoaded = true;
        return mod;
      });
    }
    return __searchModPromise;
  }
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
        key: "ffq",
        mode: "normal",
        description: "Open search panel",
        handler: (_evt) => {
          loadSearchUI().then((m) => m.openSearchPanel?.());
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
        handler: (_evt) => {
          console.log("Execute Ctrl + j");
          return true;
        }
      },
      {
        key: ["C-j", "j"],
        mode: "normal",
        description: "Demo: Ctrl+J then j",
        handler: (_evt) => {
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
        if (globalThis.__wer_search_open) {
          return;
        }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3ZpbV9tb2RlLmpzIiwgIi4uL3NyYy9tYWluLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgbGV0IGN1cnJlbnRWaW1Nb2RlID0gXCJub3JtYWxcIjtcblxuLy8gPT09PT09PT09PT09IFBSSVZBVEUgVkFSSUFCTEUgPT09PT09PT09PT09PT09XG5jb25zdCBWSU1fTU9ERVMgPSB7XG4gIE5PUk1BTDogXCJub3JtYWxcIixcbiAgSU5TRVJUOiBcImluc2VydFwiLFxuICBWSVNVQUw6IFwidmlzdWFsXCIsXG59O1xuXG5jb25zdCBTQ1JPTExfU1RFUCA9IDgwO1xuY29uc3QgQVVUT19TQ1JPTExfRUFTRSA9IDEwO1xuXG4vLyBMYXp5IGxvYWRlciBmb3IgdGhlIHNlYXJjaCBVSSAoYnVpbHQgYXMgYW4gRVNNIGR5bmFtaWMgaW1wb3J0IHRhcmdldClcbmxldCBfX3NlYXJjaExvYWRlZCA9IGZhbHNlO1xubGV0IF9fc2VhcmNoTW9kUHJvbWlzZSA9IG51bGw7XG5mdW5jdGlvbiBsb2FkU2VhcmNoVUkoKSB7XG4gIGlmIChfX3NlYXJjaExvYWRlZCkgcmV0dXJuIF9fc2VhcmNoTW9kUHJvbWlzZTtcbiAgaWYgKCFfX3NlYXJjaE1vZFByb21pc2UpIHtcbiAgICBjb25zdCB1cmwgPSAoZ2xvYmFsVGhpcy5jaHJvbWUgJiYgY2hyb21lLnJ1bnRpbWUgJiYgY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKVxuICAgICAgPyBjaHJvbWUucnVudGltZS5nZXRVUkwoXCJqcy9kaXN0L3NlYXJjaF91aS5qc1wiKVxuICAgICAgOiBcIi9qcy9kaXN0L3NlYXJjaF91aS5qc1wiOyAvLyBmYWxsYmFjayBwYXRoIGZvciBkZXZcbiAgICBfX3NlYXJjaE1vZFByb21pc2UgPSBpbXBvcnQodXJsKS50aGVuKChtb2QpID0+IHtcbiAgICAgIHRyeSB7IG1vZC5pbml0U2VhcmNoVUk/LigpOyB9IGNhdGNoIChfKSB7fVxuICAgICAgX19zZWFyY2hMb2FkZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIG1vZDtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gX19zZWFyY2hNb2RQcm9taXNlO1xufVxuXG5jb25zdCBWSU1fQ09NTUFORFMgPSB7XG4gIGltbWVkaWF0ZTogW1xuICAgIHtcbiAgICAgIGtleTogXCJpXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiRW50ZXIgaW5zZXJ0IG1vZGVcIixcbiAgICAgIGhhbmRsZXI6ICgpID0+IHtcbiAgICAgICAgY3VycmVudFZpbU1vZGUgPSBWSU1fTU9ERVMuSU5TRVJUO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwiZmZxXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiT3BlbiBzZWFyY2ggcGFuZWxcIixcbiAgICAgIGhhbmRsZXI6IChfZXZ0KSA9PiB7XG4gICAgICAgIC8vIExhenktbG9hZCB0aGUgc2VhcmNoIFVJIGJ1bmRsZSBsaWtlIHZpbV9kaXNwbGF5XG4gICAgICAgIGxvYWRTZWFyY2hVSSgpLnRoZW4oKG0pID0+IG0ub3BlblNlYXJjaFBhbmVsPy4oKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogXCJoXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiU2Nyb2xsIGxlZnRcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBzdGVwID0gaXNSZXBlYXRcbiAgICAgICAgICA/IE1hdGgubWF4KDEsIFNDUk9MTF9TVEVQIC0gQVVUT19TQ1JPTExfRUFTRSlcbiAgICAgICAgICA6IFNDUk9MTF9TVEVQO1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGlzUmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoeyBsZWZ0OiAtc3RlcCwgYmVoYXZpb3IgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogXCJqXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiU2Nyb2xsIGRvd25cIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBzdGVwID0gaXNSZXBlYXRcbiAgICAgICAgICA/IE1hdGgubWF4KDEsIFNDUk9MTF9TVEVQIC0gQVVUT19TQ1JPTExfRUFTRSlcbiAgICAgICAgICA6IFNDUk9MTF9TVEVQO1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGlzUmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoeyB0b3A6IHN0ZXAsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwia1wiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlNjcm9sbCB1cFwiLFxuICAgICAgaGFuZGxlcjogKGV2dCkgPT4ge1xuICAgICAgICBjb25zdCBpc1JlcGVhdCA9ICEhZXZ0Py5yZXBlYXQ7XG4gICAgICAgIGNvbnN0IHN0ZXAgPSBpc1JlcGVhdFxuICAgICAgICAgID8gTWF0aC5tYXgoMSwgU0NST0xMX1NURVAgLSBBVVRPX1NDUk9MTF9FQVNFKVxuICAgICAgICAgIDogU0NST0xMX1NURVA7XG4gICAgICAgIGNvbnN0IGJlaGF2aW9yID0gaXNSZXBlYXQgPyBcImF1dG9cIiA6IFwic21vb3RoXCI7XG4gICAgICAgIHdpbmRvdy5zY3JvbGxCeSh7IHRvcDogLXN0ZXAsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwibFwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlNjcm9sbCByaWdodFwiLFxuICAgICAgaGFuZGxlcjogKGV2dCkgPT4ge1xuICAgICAgICBjb25zdCBpc1JlcGVhdCA9ICEhZXZ0Py5yZXBlYXQ7XG4gICAgICAgIGNvbnN0IHN0ZXAgPSBpc1JlcGVhdFxuICAgICAgICAgID8gTWF0aC5tYXgoMSwgU0NST0xMX1NURVAgLSBBVVRPX1NDUk9MTF9FQVNFKVxuICAgICAgICAgIDogU0NST0xMX1NURVA7XG4gICAgICAgIGNvbnN0IGJlaGF2aW9yID0gaXNSZXBlYXQgPyBcImF1dG9cIiA6IFwic21vb3RoXCI7XG4gICAgICAgIHdpbmRvdy5zY3JvbGxCeSh7IGxlZnQ6IHN0ZXAsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwiQy1qXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiQ3RybCtKIGV4YW1wbGVcIixcbiAgICAgIGhhbmRsZXI6IChfZXZ0KSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXhlY3V0ZSBDdHJsICsgalwiKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBbXCJDLWpcIiwgXCJqXCJdLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkRlbW86IEN0cmwrSiB0aGVuIGpcIixcbiAgICAgIGhhbmRsZXI6IChfZXZ0KSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXhlY3V0ZSBDdHJsICsgaiwgdGhlbiBqXCIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFtcIkMtalwiLCBcImtcIl0sXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiRGVtbzogQ3RybCtKIHRoZW4gQ3RybCtLXCIsXG4gICAgICBoYW5kbGVyOiAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXhlY3V0ZSBDdHJsICsgaiwgdGhlbiBrXCIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwiQy1kXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiUGFnZSBkb3duXCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGlzUmVwZWF0ID0gISFldnQ/LnJlcGVhdDtcbiAgICAgICAgY29uc3QgcGFnZSA9IE1hdGgubWF4KDEsIE1hdGguZmxvb3Iod2luZG93LmlubmVySGVpZ2h0ICogMC45KSk7XG4gICAgICAgIGNvbnN0IHN0ZXAgPSBpc1JlcGVhdCA/IE1hdGgubWF4KDEsIHBhZ2UgLSBBVVRPX1NDUk9MTF9FQVNFKSA6IHBhZ2U7XG4gICAgICAgIGNvbnN0IGJlaGF2aW9yID0gaXNSZXBlYXQgPyBcImF1dG9cIiA6IFwic21vb3RoXCI7XG4gICAgICAgIHdpbmRvdy5zY3JvbGxCeSh7IHRvcDogc3RlcCwgYmVoYXZpb3IgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogXCJDLXVcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJQYWdlIHVwXCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGlzUmVwZWF0ID0gISFldnQ/LnJlcGVhdDtcbiAgICAgICAgY29uc3QgcGFnZSA9IE1hdGgubWF4KDEsIE1hdGguZmxvb3Iod2luZG93LmlubmVySGVpZ2h0ICogMC45KSk7XG4gICAgICAgIGNvbnN0IHN0ZXAgPSBpc1JlcGVhdCA/IE1hdGgubWF4KDEsIHBhZ2UgLSBBVVRPX1NDUk9MTF9FQVNFKSA6IHBhZ2U7XG4gICAgICAgIGNvbnN0IGJlaGF2aW9yID0gaXNSZXBlYXQgPyBcImF1dG9cIiA6IFwic21vb3RoXCI7XG4gICAgICAgIHdpbmRvdy5zY3JvbGxCeSh7IHRvcDogLXN0ZXAsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwiZ2dcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJHbyB0byB0b3Agb2YgZG9jdW1lbnRcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBldnQ/LnJlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbFRvKHsgdG9wOiAwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcIlMtZ1wiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkdvIHRvIGJvdHRvbSBvZiBkb2N1bWVudFwiLFxuICAgICAgaGFuZGxlcjogKGV2dCkgPT4ge1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGV2dD8ucmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICBjb25zdCBkb2MgPVxuICAgICAgICAgIGRvY3VtZW50LnNjcm9sbGluZ0VsZW1lbnQgfHxcbiAgICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgfHxcbiAgICAgICAgICBkb2N1bWVudC5ib2R5O1xuICAgICAgICB3aW5kb3cuc2Nyb2xsVG8oeyB0b3A6IGRvYy5zY3JvbGxIZWlnaHQsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgXSxcbn07XG5cbi8vIFNlcXVlbmNlIHN0YXRlIGVudW0gZm9yIG1haW50YWluYWJpbGl0eVxuY29uc3QgU0VRVUVOQ0VfU1RBVEUgPSB7XG4gIElETEU6IFwiaWRsZVwiLFxuICBQUkVGSVg6IFwicHJlZml4XCIsXG4gIFBFTkRJTkdfRVhBQ1Q6IFwicGVuZGluZ0V4YWN0XCIsXG59O1xuXG4vLyBTZXF1ZW5jZSBtYXRjaGluZyBzdGF0ZSAocHJlZml4IHRyaWUgYmFzZWQpXG4vLyBVc2UgYSB0aW55IHJpbmcgYnVmZmVyIHRvIGF2b2lkIGFsbG9jYXRpb25zIGFuZCBzaGlmdHMuXG5sZXQgUkJfQ0FQID0gMjsgLy8gd2lsbCBiZSBzZXQgZnJvbSBNQVhfU0VRX0xFTiBhZnRlciB0cmllIGJ1aWxkXG5sZXQgcmIgPSBuZXcgQXJyYXkoMik7XG5sZXQgcmJTdGFydCA9IDA7IC8vIGluZGV4IG9mIG9sZGVzdFxubGV0IHJiU2l6ZSA9IDA7ICAvLyBudW1iZXIgb2YgdmFsaWQgdG9rZW5zXG5jb25zdCBUSU1FT1VUID0gNTAwO1xuLy8gU2luZ2xlIHNlcXVlbmNlIHRpbWVyL3N0YXRlICh1bmlmaWVzIHByZWZpeCBhbmQgcGVuZGluZy1leGFjdCB0aW1lcnMpXG5sZXQgc2VxVGltZXJJZCA9IG51bGw7IC8vIG51bWJlciB8IG51bGxcbmxldCBzZXFTdGF0ZSA9IFNFUVVFTkNFX1NUQVRFLklETEU7IC8vIHNlZSBTRVFVRU5DRV9TVEFURVxubGV0IHNlcUhhbmRsZXIgPSBudWxsOyAvLyBmdW5jdGlvbiB8IG51bGwgKGxhc3RFeGFjdCBmb3IgcHJlZml4LCBleGFjdCBmb3IgcGVuZGluZ0V4YWN0KVxuXG4vLyBTZXF1ZW5jZSBzdGF0ZSBtYWNoaW5lIGhlbHBlcnNcbi8vIFNlZSBSRUFETUUubWQgZm9yIHRoZSBNZXJtYWlkIGRpYWdyYW0gb2YgdGhlc2Ugc3RhdGVzIGFuZCB0cmFuc2l0aW9ucy5cbmZ1bmN0aW9uIGNsZWFyU2VxVGltZXIoKSB7XG4gIGlmIChzZXFUaW1lcklkKSB7XG4gICAgY2xlYXJUaW1lb3V0KHNlcVRpbWVySWQpO1xuICAgIHNlcVRpbWVySWQgPSBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlc2V0U2VxU3RhdGUoKSB7XG4gIHNlcVN0YXRlID0gU0VRVUVOQ0VfU1RBVEUuSURMRTtcbiAgc2VxSGFuZGxlciA9IG51bGw7XG59XG5cbi8vIFN0YXJ0IGEgdW5pZmllZCB0aW1lb3V0IHdpbmRvdyBmb3IgZWl0aGVyIFBSRUZJWCBvciBQRU5ESU5HX0VYQUNUXG4vLyBJZiBhIGhhbmRsZXIgaXMgcHJvdmlkZWQsIGl0IHdpbGwgcnVuIG9uIHRpbWVvdXQgKGUuZy4sIGxhc3RFeGFjdCBmb3IgUFJFRklYLCBleGFjdCBmb3IgUEVORElOR19FWEFDVClcbmZ1bmN0aW9uIHN0YXJ0U2VxdWVuY2VXYWl0KHN0YXRlLCBoYW5kbGVyKSB7XG4gIGNsZWFyU2VxVGltZXIoKTtcbiAgc2VxU3RhdGUgPSBzdGF0ZTtcbiAgc2VxSGFuZGxlciA9IGhhbmRsZXIgfHwgbnVsbDtcbiAgc2VxVGltZXJJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIC8vIE9ubHkgZmlyZSBpZiB3ZSdyZSBzdGlsbCBpbiB0aGUgc2FtZSBzdGF0ZSAobm8gaW50ZXJmZXJlbmNlIGZyb20gbmV3IGtleXMpXG4gICAgaWYgKHNlcVN0YXRlID09PSBzdGF0ZSAmJiBzZXFIYW5kbGVyKSB7XG4gICAgICB0cnkgeyBzZXFIYW5kbGVyKCk7IH0gY2F0Y2ggKF8pIHt9XG4gICAgfVxuICAgIHJiQ2xlYXIoKTtcbiAgICByZXNldFNlcVN0YXRlKCk7XG4gICAgY2xlYXJTZXFUaW1lcigpO1xuICB9LCBUSU1FT1VUKTtcbn1cblxuLy8gSWYgd2Ugd2VyZSBkZWZlcnJpbmcgYW4gZXhhY3QgKFBFTkRJTkdfRVhBQ1QpLCBmbHVzaCBpdCBpbW1lZGlhdGVseSAob24gZGl2ZXJnZW5jZSlcbmZ1bmN0aW9uIGZsdXNoUGVuZGluZ0lmQW55KCkge1xuICBpZiAoc2VxU3RhdGUgPT09IFNFUVVFTkNFX1NUQVRFLlBFTkRJTkdfRVhBQ1QgJiYgc2VxSGFuZGxlcikge1xuICAgIGNvbnN0IGhhbmRsZXIgPSBzZXFIYW5kbGVyO1xuICAgIGNsZWFyU2VxVGltZXIoKTtcbiAgICByZXNldFNlcVN0YXRlKCk7XG4gICAgdHJ5IHsgaGFuZGxlcigpOyB9IGNhdGNoIChfKSB7fVxuICB9XG59XG5cbi8vIEJ1aWxkIGEgdGlueSBwcmVmaXggdHJpZSBmb3IgZmFzdCBtYXRjaGluZ1xuZnVuY3Rpb24gY29tbWFuZEtleVRvVG9rZW5zKGtleSkge1xuICAvLyBBbGxvdyBhcnJheSBmb3JtIGRpcmVjdGx5LCBlLmcuLCBbXCJDLWpcIiwgXCJqXCJdXG4gIGlmIChBcnJheS5pc0FycmF5KGtleSkpIHJldHVybiBrZXkuc2xpY2UoKTtcbiAgY29uc3Qga2V5U3RyID0gU3RyaW5nKGtleSk7XG4gIC8vIFNwYWNlLWRlbGltaXRlZCB0b2tlbnMsIGUuZy4sIFwiQy1qIGpcIiA9PiBbXCJDLWpcIixcImpcIl1cbiAgaWYgKGtleVN0ci5pbmNsdWRlcyhcIiBcIikpIHJldHVybiBrZXlTdHIudHJpbSgpLnNwbGl0KC9cXHMrLyk7XG5cbiAgLy8gSHlwaGVuIGhhbmRsaW5nOiB0cmVhdCBsZWFkaW5nIG1vZGlmaWVycyAoQywgUykgYXMgcGFydCBvZiBmaXJzdCB0b2tlbiBvbmx5LlxuICAvLyBFeGFtcGxlOiBcIkMtai1qXCIgPT4gW1wiQy1qXCIsIFwialwiXSA7IFwiQy1TLWotZ1wiID0+IFtcIkMtUy1qXCIsIFwiZ1wiXVxuICBpZiAoa2V5U3RyLmluY2x1ZGVzKFwiLVwiKSkge1xuICAgIGNvbnN0IHNlZ3MgPSBrZXlTdHIuc3BsaXQoXCItXCIpO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCBtb2RzID0gW107XG4gICAgd2hpbGUgKGkgPCBzZWdzLmxlbmd0aCAmJiAoc2Vnc1tpXSA9PT0gXCJDXCIgfHwgc2Vnc1tpXSA9PT0gXCJTXCIpKSB7XG4gICAgICBtb2RzLnB1c2goc2Vnc1tpXSk7XG4gICAgICBpKys7XG4gICAgfVxuICAgIGlmIChpIDwgc2Vncy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IGJhc2UgPSBzZWdzW2krK107XG4gICAgICBjb25zdCBmaXJzdCA9IChtb2RzLmxlbmd0aCA/IG1vZHMuam9pbihcIi1cIikgKyBcIi1cIiA6IFwiXCIpICsgYmFzZTtcbiAgICAgIGNvbnN0IHJlc3QgPSBzZWdzLnNsaWNlKGkpO1xuICAgICAgcmV0dXJuIFtmaXJzdCwgLi4ucmVzdF07XG4gICAgfVxuICAgIHJldHVybiBba2V5U3RyXTtcbiAgfVxuXG4gIC8vIEZhbGxiYWNrOiBzcGxpdCBpbnRvIGluZGl2aWR1YWwgY2hhcmFjdGVycyAoZS5nLiwgXCJnZ1wiID0+IFtcImdcIixcImdcIl0pLlxuICByZXR1cm4ga2V5U3RyLnNwbGl0KFwiXCIpO1xufVxuXG5mdW5jdGlvbiBidWlsZENvbW1hbmRUcmllKGNvbW1hbmRzKSB7XG4gIGNvbnN0IHJvb3QgPSB7IGNoaWxkcmVuOiBuZXcgTWFwKCksIGhhbmRsZXI6IG51bGwgfTtcbiAgbGV0IG1heExlbiA9IDE7XG4gIGZvciAoY29uc3QgY21kIG9mIGNvbW1hbmRzKSB7XG4gICAgY29uc3QgdG9rZW5zID0gY29tbWFuZEtleVRvVG9rZW5zKGNtZC5rZXkpO1xuICAgIG1heExlbiA9IE1hdGgubWF4KG1heExlbiwgdG9rZW5zLmxlbmd0aCk7XG4gICAgbGV0IG5vZGUgPSByb290O1xuICAgIGZvciAoY29uc3QgdCBvZiB0b2tlbnMpIHtcbiAgICAgIGlmICghbm9kZS5jaGlsZHJlbi5oYXModCkpXG4gICAgICAgIG5vZGUuY2hpbGRyZW4uc2V0KHQsIHsgY2hpbGRyZW46IG5ldyBNYXAoKSwgaGFuZGxlcjogbnVsbCB9KTtcbiAgICAgIG5vZGUgPSBub2RlLmNoaWxkcmVuLmdldCh0KTtcbiAgICB9XG4gICAgLy8gTGFzdCB0b2tlbjogc3RvcmUgaGFuZGxlclxuICAgIG5vZGUuaGFuZGxlciA9IGNtZC5oYW5kbGVyO1xuICB9XG4gIHJldHVybiB7IHJvb3QsIG1heExlbiB9O1xufVxuXG5jb25zdCB7IHJvb3Q6IENPTU1BTkRfVFJJRSwgbWF4TGVuOiBNQVhfU0VRX0xFTiB9ID0gYnVpbGRDb21tYW5kVHJpZShcbiAgVklNX0NPTU1BTkRTLmltbWVkaWF0ZSxcbik7XG4vLyBJbml0aWFsaXplIHJpbmcgYnVmZmVyIGNhcGFjaXR5IGZyb20gY29tcHV0ZWQgbWF4IGxlbmd0aCAobWluIDEpXG5SQl9DQVAgPSBNYXRoLm1heCgxLCBNQVhfU0VRX0xFTik7XG5yYiA9IG5ldyBBcnJheShSQl9DQVApO1xuXG4vLyA9PT09PT09PT09PT0gUFJJVkFURSBmdW5jdGlvbiA9PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5wdXRGaWVsZChlbGVtZW50KSB7XG4gIHJldHVybiAoXG4gICAgZWxlbWVudCAmJlxuICAgIChlbGVtZW50LnRhZ05hbWUgPT09IFwiSU5QVVRcIiB8fFxuICAgICAgZWxlbWVudC50YWdOYW1lID09PSBcIlRFWFRBUkVBXCIgfHxcbiAgICAgIGVsZW1lbnQuaXNDb250ZW50RWRpdGFibGUpXG4gICk7XG59XG5cbi8vIE5vcm1hbGl6ZSBhIGtleSBldmVudCBpbnRvIGEgdG9rZW4gdGhhdCBpbmNsdWRlcyBDdHJsL1NoaWZ0IHdoZW4gcHJlc2VudC5cbi8vIENhbGxlciBwcmUtY29tcHV0ZXMgd2hldGhlciB0aGlzIGlzIHRoZSBmaXJzdCB0b2tlbiBpbiB0aGUgc2VxdWVuY2UgZm9yIHBlcmYuXG4vLyBFeGFtcGxlczogXCJqXCIsIFwiQy1qXCIsIFwiUy1qXCIsIFwiQy1TLWpcIiwgXCJTLUFycm93RG93blwiXG5mdW5jdGlvbiBub3JtYWxpemVLZXlUb2tlbihlLCBpc0ZpcnN0KSB7XG4gIGNvbnN0IGsgPSBlLmtleTtcblxuICAvLyBJZ25vcmUgc3RhbmRhbG9uZSBtb2RpZmllciBrZXlzXG4gIGlmIChrID09PSBcIlNoaWZ0XCIgfHwgayA9PT0gXCJDb250cm9sXCIgfHwgayA9PT0gXCJBbHRcIiB8fCBrID09PSBcIk1ldGFcIikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gQmFzZSBrZXkgKGxvd2VyY2FzZWQgZm9yIGxldHRlcnMgdG8ga2VlcCB0b2tlbnMgY29uc2lzdGVudClcbiAgbGV0IGJhc2UgPSBrLmxlbmd0aCA9PT0gMSA/IGsudG9Mb3dlckNhc2UoKSA6IGs7XG5cbiAgLy8gRmFzdCBwYXRoOiBub24tZmlyc3QgdG9rZW5zIGlnbm9yZSBtb2RpZmllcnMgKGtlZXBzIHNlcXVlbmNlcyBzbW9vdGgpXG4gIGlmICghaXNGaXJzdCkgcmV0dXJuIGJhc2U7XG5cbiAgLy8gT25seSBlbmNvZGUgbW9kaWZpZXJzIG9uIHRoZSBGSVJTVCB0b2tlbiBvZiBhIHNlcXVlbmNlXG4gIGNvbnN0IG1vZHMgPSBbXTtcbiAgaWYgKGUuY3RybEtleSkgbW9kcy5wdXNoKFwiQ1wiKTtcbiAgaWYgKGUuc2hpZnRLZXkpIG1vZHMucHVzaChcIlNcIik7XG4gIHJldHVybiBtb2RzLmxlbmd0aCA/IG1vZHMuam9pbihcIi1cIikgKyBcIi1cIiArIGJhc2UgOiBiYXNlO1xufVxuXG4vLyBIZWxwZXI6IHJpbmcgYnVmZmVyIG9wZXJhdGlvbnNcbmZ1bmN0aW9uIHJiQ2xlYXIoKSB7XG4gIHJiU3RhcnQgPSAwOyByYlNpemUgPSAwO1xufVxuZnVuY3Rpb24gcmJQdXNoKHRva2VuKSB7XG4gIGlmIChyYlNpemUgPCBSQl9DQVApIHtcbiAgICByYlsocmJTdGFydCArIHJiU2l6ZSkgJSBSQl9DQVBdID0gdG9rZW47XG4gICAgcmJTaXplKys7XG4gIH0gZWxzZSB7XG4gICAgLy8gb3ZlcndyaXRlIG9sZGVzdFxuICAgIHJiW3JiU3RhcnRdID0gdG9rZW47XG4gICAgcmJTdGFydCA9IChyYlN0YXJ0ICsgMSkgJSBSQl9DQVA7XG4gIH1cbn1cbmZ1bmN0aW9uIHJiU2V0TGF0ZXN0KHRva2VuKSB7XG4gIHJiU3RhcnQgPSAwOyByYlNpemUgPSAxOyByYlswXSA9IHRva2VuO1xufVxuXG4vLyBBdHRlbXB0IHRvIG1hdGNoIHRva2VucyBjdXJyZW50bHkgaW4gcmluZyBidWZmZXJcbmZ1bmN0aW9uIGF0dGVtcHRNYXRjaEZyb21SaW5nKCkge1xuICBsZXQgbm9kZSA9IENPTU1BTkRfVFJJRTtcbiAgbGV0IGxhc3RFeGFjdCA9IG51bGw7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcmJTaXplOyBpKyspIHtcbiAgICBjb25zdCB0ID0gcmJbKHJiU3RhcnQgKyBpKSAlIFJCX0NBUF07XG4gICAgY29uc3QgbmV4dCA9IG5vZGUuY2hpbGRyZW4uZ2V0KHQpO1xuICAgIGlmICghbmV4dCkge1xuICAgICAgcmV0dXJuIHsgdHlwZTogXCJub25lXCIsIGxhc3RFeGFjdCB9O1xuICAgIH1cbiAgICBub2RlID0gbmV4dDtcbiAgICBpZiAobm9kZS5oYW5kbGVyKSBsYXN0RXhhY3QgPSB7IGhhbmRsZXI6IG5vZGUuaGFuZGxlciwgZGVwdGg6IGkgKyAxIH07XG4gIH1cbiAgaWYgKG5vZGUuaGFuZGxlcikgcmV0dXJuIHsgdHlwZTogXCJleGFjdFwiLCBoYW5kbGVyOiBub2RlLmhhbmRsZXIsIGhhc0NoaWxkcmVuOiBub2RlLmNoaWxkcmVuLnNpemUgPiAwIH07XG4gIGlmIChub2RlLmNoaWxkcmVuLnNpemUgPiAwKSByZXR1cm4geyB0eXBlOiBcInByZWZpeFwiLCBsYXN0RXhhY3QgfTtcbiAgcmV0dXJuIHsgdHlwZTogXCJub25lXCIsIGxhc3RFeGFjdCB9O1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIGtleSB3YXMgaGFuZGxlZCAoZXhhY3Qgb3IgcHJlZml4IG1hdGNoKSwgZmFsc2Ugb3RoZXJ3aXNlXG5jb25zdCBub3JtYWxNb2RlSGFuZGxlciA9IChlKSA9PiB7XG4gIC8vIFByZS1jb21wdXRlIFwiaXMgZmlyc3QgdG9rZW5cIiBzbyBub3JtYWxpemVyIGNhbiB0YWtlIHRoZSBmYXN0IHBhdGhcbiAgY29uc3QgdG9rZW4gPSBub3JtYWxpemVLZXlUb2tlbihlLCByYlNpemUgPT09IDApO1xuICBpZiAoIXRva2VuKSByZXR1cm4gZmFsc2U7IC8vIGlnbm9yZWQgKHB1cmUgbW9kaWZpZXIpXG5cbiAgLy8gQXBwZW5kIHRva2VuIChyaW5nIGJ1ZmZlcilcbiAgcmJQdXNoKHRva2VuKTtcblxuICAvLyBUcnkgdG8gbWF0Y2ggdGhlIGN1cnJlbnQgYnVmZmVyXG4gIGxldCByZXN1bHQgPSBhdHRlbXB0TWF0Y2hGcm9tUmluZygpO1xuXG4gIHN3aXRjaCAocmVzdWx0LnR5cGUpIHtcbiAgICBjYXNlIFwiZXhhY3RcIjoge1xuICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIHNlcXVlbmNlIHRpbWVyIGFuZCByZXNldCBzdGF0ZVxuICAgICAgY2xlYXJTZXFUaW1lcigpO1xuICAgICAgcmVzZXRTZXFTdGF0ZSgpO1xuICAgICAgaWYgKHJlc3VsdC5oYXNDaGlsZHJlbikge1xuICAgICAgICBzdGFydFNlcXVlbmNlV2FpdChTRVFVRU5DRV9TVEFURS5QRU5ESU5HX0VYQUNULCByZXN1bHQuaGFuZGxlcik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgdHJ5IHsgcmVzdWx0LmhhbmRsZXIoZSk7IH0gY2F0Y2ggKF8pIHt9XG4gICAgICByYkNsZWFyKCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY2FzZSBcInByZWZpeFwiOiB7XG4gICAgICBjb25zdCBsYXN0RXhhY3QgPSByZXN1bHQubGFzdEV4YWN0OyAvLyBtYXkgYmUgbnVsbFxuICAgICAgc3RhcnRTZXF1ZW5jZVdhaXQoU0VRVUVOQ0VfU1RBVEUuUFJFRklYLCBsYXN0RXhhY3Q/LmhhbmRsZXIgfHwgbnVsbCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY2FzZSBcIm5vbmVcIjpcbiAgICBkZWZhdWx0OlxuICAgICAgLy8gZmFsbCB0aHJvdWdoIHRvIGRpdmVyZ2VuY2UgaGFuZGxpbmdcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgLy8gTm8gbWF0Y2ggd2l0aCBjdXJyZW50IGJ1ZmZlcjsgdHJ5IHdpdGggb25seSB0aGUgbGF0ZXN0IHRva2VuXG4gIC8vIElmIHdlIGhhZCBhIHBlbmRpbmcgZXhhY3Qgd2FpdGluZyBmb3IgY29udGludWF0aW9uLCBmbHVzaCBpdCBpbW1lZGlhdGVseSBvbiBkaXZlcmdlbmNlXG4gIGZsdXNoUGVuZGluZ0lmQW55KCk7XG5cbiAgcmJTZXRMYXRlc3QodG9rZW4pO1xuICByZXN1bHQgPSBhdHRlbXB0TWF0Y2hGcm9tUmluZygpO1xuICBzd2l0Y2ggKHJlc3VsdC50eXBlKSB7XG4gICAgY2FzZSBcImV4YWN0XCI6IHtcbiAgICAgIGNsZWFyU2VxVGltZXIoKTtcbiAgICAgIHJlc2V0U2VxU3RhdGUoKTtcbiAgICAgIGlmIChyZXN1bHQuaGFzQ2hpbGRyZW4pIHtcbiAgICAgICAgc3RhcnRTZXF1ZW5jZVdhaXQoU0VRVUVOQ0VfU1RBVEUuUEVORElOR19FWEFDVCwgcmVzdWx0LmhhbmRsZXIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHRyeSB7IHJlc3VsdC5oYW5kbGVyKGUpOyB9IGNhdGNoIChfKSB7fVxuICAgICAgcmJDbGVhcigpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNhc2UgXCJwcmVmaXhcIjoge1xuICAgICAgc3RhcnRTZXF1ZW5jZVdhaXQoU0VRVUVOQ0VfU1RBVEUuUFJFRklYLCBudWxsKTsgLy8gbm8gc2hvcnRlciBleGFjdCBrbm93biBoZXJlXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY2FzZSBcIm5vbmVcIjpcbiAgICBkZWZhdWx0OlxuICAgICAgYnJlYWs7XG4gIH1cblxuICAvLyBTdGlsbCBubyBtYXRjaFxuICBjbGVhclNlcVRpbWVyKCk7XG4gIHJlc2V0U2VxU3RhdGUoKTtcbiAgcmJDbGVhcigpO1xuICByZXR1cm4gZmFsc2U7XG59O1xuXG5jb25zdCBpbnNlcnRNb2RlSGFuZGxlciA9IChlKSA9PiB7XG4gIGlmIChlLmtleSA9PT0gXCJFc2NhcGVcIikge1xuICAgIGN1cnJlbnRWaW1Nb2RlID0gVklNX01PREVTLk5PUk1BTDtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVLZXlkb3duID0gKGUpID0+IHtcbiAgc3dpdGNoIChjdXJyZW50VmltTW9kZSkge1xuICAgIGNhc2UgVklNX01PREVTLk5PUk1BTDoge1xuICAgICAgLy8gSWYgc2VhcmNoIG92ZXJsYXkgaXMgb3BlbiwgbGV0IGl0IGhhbmRsZSBrZXlzIGFuZCBkb24ndCBpbnRlcmNlcHRcbiAgICAgIGlmIChnbG9iYWxUaGlzLl9fd2VyX3NlYXJjaF9vcGVuKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIC8vIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAvLyBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgbm9ybWFsTW9kZUhhbmRsZXIoZSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSBWSU1fTU9ERVMuSU5TRVJUOlxuICAgICAgaW5zZXJ0TW9kZUhhbmRsZXIoZSk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS53YXJuKFwiVW5leHBlY3RlZCBtb2RlOlwiLCBjdXJyZW50VmltTW9kZSk7XG4gICAgICBicmVhaztcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZUNsaWNrID0gKGUpID0+IHtcbiAgc3dpdGNoIChjdXJyZW50VmltTW9kZSkge1xuICAgIGNhc2UgVklNX01PREVTLk5PUk1BTDoge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQ7XG4gICAgICBpZiAoaXNJbnB1dEZpZWxkKHRhcmdldCkpIHtcbiAgICAgICAgY3VycmVudFZpbU1vZGUgPSBWSU1fTU9ERVMuSU5TRVJUO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNhc2UgVklNX01PREVTLklOU0VSVDpcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLndhcm4oXCJVbmV4cGVjdGVkIG1vZGU6XCIsIGN1cnJlbnRWaW1Nb2RlKTtcbiAgICAgIGJyZWFrO1xuICB9XG59O1xuIiwgIi8vIFRpbnksIGlkZW1wb3RlbnQgYm9vdHN0cmFwIHRoYXQgbGF6eS1sb2FkcyBET00gbG9naWMgb24gZmlyc3QgdXNlLlxuaW1wb3J0IHsgaGFuZGxlS2V5ZG93biwgaGFuZGxlQ2xpY2ssIGN1cnJlbnRWaW1Nb2RlIH0gZnJvbSBcIi4vdmltX21vZGUuanNcIjtcblxuY29uc3QgQk9PVFNUUkFQX0ZMQUcgPSBcIl9fd2VyX2Jvb3RzdHJhcF9pbnN0YWxsZWRcIjtcblxuLy8gUHJldmVudCBkdXBsaWNhdGUgaW5zdGFsbHMgKFNQQXMsIGJmY2FjaGUsIHJlLWluamVjdGlvbilcbmlmICghZ2xvYmFsVGhpc1tCT09UU1RSQVBfRkxBR10pIHtcbiAgZ2xvYmFsVGhpc1tCT09UU1RSQVBfRkxBR10gPSB0cnVlO1xuICBjb25zb2xlLmxvZyhcIkRlZmF1bHQgbW9kZTogXCIgKyBjdXJyZW50VmltTW9kZSk7XG5cbiAgLy8gVmltIGtleWRvd24gaGFuZGxlciBpcyBpbXBvcnRlZCBmcm9tIHZpbV9tb2RlLmpzXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGhhbmRsZUtleWRvd24sIHsgY2FwdHVyZTogdHJ1ZSB9KTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhhbmRsZUNsaWNrLCB7IGNhcHR1cmU6IHRydWUgfSk7XG5cbiAgLy8gTGF6eS1sb2FkIHZpbV9kaXNwbGF5IGFmdGVyIGZpcnN0IGludGVyYWN0aW9uLCB0aGVuIGtlZXAgaXQgaW4gc3luY1xuICBsZXQgX192aW1EaXNwbGF5TG9hZGVkID0gZmFsc2U7XG4gIGxldCBfX3ZpbURpc3BsYXlNb2RQcm9taXNlID0gbnVsbDtcbiAgY29uc3QgbG9hZFZpbURpc3BsYXkgPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKF9fdmltRGlzcGxheUxvYWRlZCkgcmV0dXJuIF9fdmltRGlzcGxheU1vZFByb21pc2U7XG4gICAgaWYgKCFfX3ZpbURpc3BsYXlNb2RQcm9taXNlKSB7XG4gICAgICBjb25zdCB1cmwgPSAoZ2xvYmFsVGhpcy5jaHJvbWUgJiYgY2hyb21lLnJ1bnRpbWUgJiYgY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKVxuICAgICAgICA/IGNocm9tZS5ydW50aW1lLmdldFVSTChcImpzL2Rpc3QvdmltX2Rpc3BsYXkuanNcIilcbiAgICAgICAgOiBcIi9qcy9kaXN0L3ZpbV9kaXNwbGF5LmpzXCI7IC8vIGZhbGxiYWNrIHBhdGggZm9yIGRldiBzdGF0aWMgc2VydmluZ1xuICAgICAgX192aW1EaXNwbGF5TW9kUHJvbWlzZSA9IGltcG9ydCh1cmwpLnRoZW4oKG1vZCkgPT4ge1xuICAgICAgICB0cnkgeyBtb2QuaW5pdFZpbURpc3BsYXk/LigpOyB9IGNhdGNoIChfKSB7fVxuICAgICAgICBfX3ZpbURpc3BsYXlMb2FkZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gbW9kO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBfX3ZpbURpc3BsYXlNb2RQcm9taXNlO1xuICB9O1xuXG4gIC8vIFVwZGF0ZSBBRlRFUiB2aW0gaGFuZGxlcnMgcnVuIChidWJibGUgcGhhc2UpLiBUcmlnZ2VycyBsYXp5IGxvYWQgb24gZmlyc3QgZXZlbnQuXG4gIGNvbnN0IHN5bmNPbktleWRvd24gPSAoKSA9PiB7IGxvYWRWaW1EaXNwbGF5KCkudGhlbigobSkgPT4gbS5zeW5jVmltRGlzcGxheT8uKGN1cnJlbnRWaW1Nb2RlKSk7IH07XG4gIGNvbnN0IHN5bmNPbkNsaWNrID0gKCkgPT4geyBsb2FkVmltRGlzcGxheSgpLnRoZW4oKG0pID0+IG0uc3luY1ZpbURpc3BsYXk/LihjdXJyZW50VmltTW9kZSkpOyB9O1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBzeW5jT25LZXlkb3duLCB7IGNhcHR1cmU6IGZhbHNlIH0pO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc3luY09uQ2xpY2ssIHsgY2FwdHVyZTogZmFsc2UgfSk7XG5cbiAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGFzeW5jIChtc2cpID0+IHtcbiAgICBpZiAobXNnPy5hY3Rpb24gPT09IFwiY2xlYW51cFwiKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBoYW5kbGVLZXlkb3duLCB7IGNhcHR1cmU6IHRydWUgfSk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgaGFuZGxlQ2xpY2ssIHsgY2FwdHVyZTogdHJ1ZSB9KTtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHN5bmNPbktleWRvd24sIHsgY2FwdHVyZTogZmFsc2UgfSk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc3luY09uQ2xpY2ssIHsgY2FwdHVyZTogZmFsc2UgfSk7XG4gICAgICAvLyBDbGVhbiB1cCB0aGUgVUkgaWYgaXQgd2FzIGxvYWRlZFxuICAgICAgaWYgKF9fdmltRGlzcGxheUxvYWRlZCkge1xuICAgICAgICBfX3ZpbURpc3BsYXlNb2RQcm9taXNlPy50aGVuKChtKSA9PiBtLmNsZWFudXBWaW1EaXNwbGF5Py4oKSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7O0FBQU8sTUFBSSxpQkFBaUI7QUFHNUIsTUFBTSxZQUFZO0FBQUEsSUFDaEIsUUFBUTtBQUFBLElBQ1IsUUFBUTtBQUFBLElBQ1IsUUFBUTtBQUFBLEVBQ1Y7QUFFQSxNQUFNLGNBQWM7QUFDcEIsTUFBTSxtQkFBbUI7QUFHekIsTUFBSSxpQkFBaUI7QUFDckIsTUFBSSxxQkFB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
