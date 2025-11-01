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
    if (result.type === "exact") {
      if (seqTimerId) {
        clearTimeout(seqTimerId);
        seqTimerId = null;
      }
      seqState = SEQUENCE_STATE.IDLE;
      seqHandler = null;
      if (result.hasChildren) {
        seqState = SEQUENCE_STATE.PENDING_EXACT;
        seqHandler = result.handler;
        seqTimerId = setTimeout(() => {
          if (seqState === SEQUENCE_STATE.PENDING_EXACT && seqHandler) {
            try {
              seqHandler();
            } catch (_) {
            }
          }
          rbClear();
          seqState = SEQUENCE_STATE.IDLE;
          seqHandler = null;
          seqTimerId = null;
        }, TIMEOUT);
        return true;
      }
      try {
        result.handler(e);
      } catch (_) {
      }
      rbClear();
      return true;
    }
    if (result.type === "prefix") {
      if (seqTimerId) {
        clearTimeout(seqTimerId);
        seqTimerId = null;
      }
      const lastExact = result.lastExact;
      seqState = SEQUENCE_STATE.PREFIX;
      seqHandler = lastExact?.handler || null;
      seqTimerId = setTimeout(() => {
        if (seqState === SEQUENCE_STATE.PREFIX && seqHandler) {
          try {
            seqHandler();
          } catch (_) {
          }
        }
        rbClear();
        seqState = SEQUENCE_STATE.IDLE;
        seqHandler = null;
        seqTimerId = null;
      }, TIMEOUT);
      return true;
    }
    if (seqState === SEQUENCE_STATE.PENDING_EXACT && seqHandler) {
      if (seqTimerId) {
        clearTimeout(seqTimerId);
        seqTimerId = null;
      }
      try {
        seqHandler();
      } catch (_) {
      }
      seqState = SEQUENCE_STATE.IDLE;
      seqHandler = null;
    }
    rbSetLatest(token);
    result = attemptMatchFromRing();
    if (result.type === "exact") {
      if (seqTimerId) {
        clearTimeout(seqTimerId);
        seqTimerId = null;
      }
      seqState = SEQUENCE_STATE.IDLE;
      seqHandler = null;
      if (result.hasChildren) {
        seqState = SEQUENCE_STATE.PENDING_EXACT;
        seqHandler = result.handler;
        seqTimerId = setTimeout(() => {
          if (seqState === SEQUENCE_STATE.PENDING_EXACT && seqHandler) {
            try {
              seqHandler();
            } catch (_) {
            }
          }
          rbClear();
          seqState = SEQUENCE_STATE.IDLE;
          seqHandler = null;
          seqTimerId = null;
        }, TIMEOUT);
        return true;
      }
      try {
        result.handler(e);
      } catch (_) {
      }
      rbClear();
      return true;
    }
    if (result.type === "prefix") {
      if (seqTimerId) {
        clearTimeout(seqTimerId);
        seqTimerId = null;
      }
      seqState = SEQUENCE_STATE.PREFIX;
      seqHandler = null;
      seqTimerId = setTimeout(() => {
        if (seqState === SEQUENCE_STATE.PREFIX && seqHandler) {
          try {
            seqHandler();
          } catch (_) {
          }
        }
        rbClear();
        seqState = SEQUENCE_STATE.IDLE;
        seqHandler = null;
        seqTimerId = null;
      }, TIMEOUT);
      return true;
    }
    if (seqTimerId) {
      clearTimeout(seqTimerId);
      seqTimerId = null;
    }
    seqState = SEQUENCE_STATE.IDLE;
    seqHandler = null;
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3ZpbV9tb2RlLmpzIiwgIi4uL3NyYy9tYWluLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgbGV0IGN1cnJlbnRWaW1Nb2RlID0gXCJub3JtYWxcIjtcblxuLy8gPT09PT09PT09PT09IFBSSVZBVEUgVkFSSUFCTEUgPT09PT09PT09PT09PT09XG5jb25zdCBWSU1fTU9ERVMgPSB7XG4gIE5PUk1BTDogXCJub3JtYWxcIixcbiAgSU5TRVJUOiBcImluc2VydFwiLFxuICBWSVNVQUw6IFwidmlzdWFsXCIsXG59O1xuXG5jb25zdCBTQ1JPTExfU1RFUCA9IDgwO1xuY29uc3QgQVVUT19TQ1JPTExfRUFTRSA9IDEwO1xuXG5jb25zdCBWSU1fQ09NTUFORFMgPSB7XG4gIGltbWVkaWF0ZTogW1xuICAgIHtcbiAgICAgIGtleTogXCJpXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiRW50ZXIgaW5zZXJ0IG1vZGVcIixcbiAgICAgIGhhbmRsZXI6ICgpID0+IHtcbiAgICAgICAgY3VycmVudFZpbU1vZGUgPSBWSU1fTU9ERVMuSU5TRVJUO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwiaFwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlNjcm9sbCBsZWZ0XCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGlzUmVwZWF0ID0gISFldnQ/LnJlcGVhdDtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0XG4gICAgICAgICAgPyBNYXRoLm1heCgxLCBTQ1JPTExfU1RFUCAtIEFVVE9fU0NST0xMX0VBU0UpXG4gICAgICAgICAgOiBTQ1JPTExfU1RFUDtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgbGVmdDogLXN0ZXAsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwialwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlNjcm9sbCBkb3duXCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGlzUmVwZWF0ID0gISFldnQ/LnJlcGVhdDtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0XG4gICAgICAgICAgPyBNYXRoLm1heCgxLCBTQ1JPTExfU1RFUCAtIEFVVE9fU0NST0xMX0VBU0UpXG4gICAgICAgICAgOiBTQ1JPTExfU1RFUDtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgdG9wOiBzdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcImtcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJTY3JvbGwgdXBcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBzdGVwID0gaXNSZXBlYXRcbiAgICAgICAgICA/IE1hdGgubWF4KDEsIFNDUk9MTF9TVEVQIC0gQVVUT19TQ1JPTExfRUFTRSlcbiAgICAgICAgICA6IFNDUk9MTF9TVEVQO1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGlzUmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoeyB0b3A6IC1zdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcImxcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJTY3JvbGwgcmlnaHRcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBzdGVwID0gaXNSZXBlYXRcbiAgICAgICAgICA/IE1hdGgubWF4KDEsIFNDUk9MTF9TVEVQIC0gQVVUT19TQ1JPTExfRUFTRSlcbiAgICAgICAgICA6IFNDUk9MTF9TVEVQO1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGlzUmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoeyBsZWZ0OiBzdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcIkMtalwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkN0cmwrSiBleGFtcGxlXCIsXG4gICAgICBoYW5kbGVyOiAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXhlY3V0ZSBDdHJsICsgalwiKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBbXCJDLWpcIiwgXCJqXCJdLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkRlbW86IEN0cmwrSiB0aGVuIGpcIixcbiAgICAgIGhhbmRsZXI6ICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFeGVjdXRlIEN0cmwgKyBqLCB0aGVuIGpcIik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogW1wiQy1qXCIsIFwia1wiXSxcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJEZW1vOiBDdHJsK0ogdGhlbiBDdHJsK0tcIixcbiAgICAgIGhhbmRsZXI6ICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFeGVjdXRlIEN0cmwgKyBqLCB0aGVuIGtcIik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogXCJDLWRcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJQYWdlIGRvd25cIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBwYWdlID0gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcih3aW5kb3cuaW5uZXJIZWlnaHQgKiAwLjkpKTtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0ID8gTWF0aC5tYXgoMSwgcGFnZSAtIEFVVE9fU0NST0xMX0VBU0UpIDogcGFnZTtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgdG9wOiBzdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcIkMtdVwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlBhZ2UgdXBcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBwYWdlID0gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcih3aW5kb3cuaW5uZXJIZWlnaHQgKiAwLjkpKTtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0ID8gTWF0aC5tYXgoMSwgcGFnZSAtIEFVVE9fU0NST0xMX0VBU0UpIDogcGFnZTtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgdG9wOiAtc3RlcCwgYmVoYXZpb3IgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogXCJnZ1wiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkdvIHRvIHRvcCBvZiBkb2N1bWVudFwiLFxuICAgICAgaGFuZGxlcjogKGV2dCkgPT4ge1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGV2dD8ucmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsVG8oeyB0b3A6IDAsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwiUy1nXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiR28gdG8gYm90dG9tIG9mIGRvY3VtZW50XCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGJlaGF2aW9yID0gZXZ0Py5yZXBlYXQgPyBcImF1dG9cIiA6IFwic21vb3RoXCI7XG4gICAgICAgIGNvbnN0IGRvYyA9XG4gICAgICAgICAgZG9jdW1lbnQuc2Nyb2xsaW5nRWxlbWVudCB8fFxuICAgICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCB8fFxuICAgICAgICAgIGRvY3VtZW50LmJvZHk7XG4gICAgICAgIHdpbmRvdy5zY3JvbGxUbyh7IHRvcDogZG9jLnNjcm9sbEhlaWdodCwgYmVoYXZpb3IgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICBdLFxufTtcblxuLy8gU2VxdWVuY2Ugc3RhdGUgZW51bSBmb3IgbWFpbnRhaW5hYmlsaXR5XG5jb25zdCBTRVFVRU5DRV9TVEFURSA9IHtcbiAgSURMRTogXCJpZGxlXCIsXG4gIFBSRUZJWDogXCJwcmVmaXhcIixcbiAgUEVORElOR19FWEFDVDogXCJwZW5kaW5nRXhhY3RcIixcbn07XG5cbi8vIFNlcXVlbmNlIG1hdGNoaW5nIHN0YXRlIChwcmVmaXggdHJpZSBiYXNlZClcbi8vIFVzZSBhIHRpbnkgcmluZyBidWZmZXIgdG8gYXZvaWQgYWxsb2NhdGlvbnMgYW5kIHNoaWZ0cy5cbmxldCBSQl9DQVAgPSAyOyAvLyB3aWxsIGJlIHNldCBmcm9tIE1BWF9TRVFfTEVOIGFmdGVyIHRyaWUgYnVpbGRcbmxldCByYiA9IG5ldyBBcnJheSgyKTtcbmxldCByYlN0YXJ0ID0gMDsgLy8gaW5kZXggb2Ygb2xkZXN0XG5sZXQgcmJTaXplID0gMDsgIC8vIG51bWJlciBvZiB2YWxpZCB0b2tlbnNcbmNvbnN0IFRJTUVPVVQgPSA1MDA7XG4vLyBTaW5nbGUgc2VxdWVuY2UgdGltZXIvc3RhdGUgKHVuaWZpZXMgcHJlZml4IGFuZCBwZW5kaW5nLWV4YWN0IHRpbWVycylcbmxldCBzZXFUaW1lcklkID0gbnVsbDsgLy8gbnVtYmVyIHwgbnVsbFxubGV0IHNlcVN0YXRlID0gU0VRVUVOQ0VfU1RBVEUuSURMRTsgLy8gc2VlIFNFUVVFTkNFX1NUQVRFXG5sZXQgc2VxSGFuZGxlciA9IG51bGw7IC8vIGZ1bmN0aW9uIHwgbnVsbCAobGFzdEV4YWN0IGZvciBwcmVmaXgsIGV4YWN0IGZvciBwZW5kaW5nRXhhY3QpXG5cbi8vIEJ1aWxkIGEgdGlueSBwcmVmaXggdHJpZSBmb3IgZmFzdCBtYXRjaGluZ1xuZnVuY3Rpb24gY29tbWFuZEtleVRvVG9rZW5zKGtleSkge1xuICAvLyBBbGxvdyBhcnJheSBmb3JtIGRpcmVjdGx5LCBlLmcuLCBbXCJDLWpcIiwgXCJqXCJdXG4gIGlmIChBcnJheS5pc0FycmF5KGtleSkpIHJldHVybiBrZXkuc2xpY2UoKTtcbiAgY29uc3Qga2V5U3RyID0gU3RyaW5nKGtleSk7XG4gIC8vIFNwYWNlLWRlbGltaXRlZCB0b2tlbnMsIGUuZy4sIFwiQy1qIGpcIiA9PiBbXCJDLWpcIixcImpcIl1cbiAgaWYgKGtleVN0ci5pbmNsdWRlcyhcIiBcIikpIHJldHVybiBrZXlTdHIudHJpbSgpLnNwbGl0KC9cXHMrLyk7XG5cbiAgLy8gSHlwaGVuIGhhbmRsaW5nOiB0cmVhdCBsZWFkaW5nIG1vZGlmaWVycyAoQywgUykgYXMgcGFydCBvZiBmaXJzdCB0b2tlbiBvbmx5LlxuICAvLyBFeGFtcGxlOiBcIkMtai1qXCIgPT4gW1wiQy1qXCIsIFwialwiXSA7IFwiQy1TLWotZ1wiID0+IFtcIkMtUy1qXCIsIFwiZ1wiXVxuICBpZiAoa2V5U3RyLmluY2x1ZGVzKFwiLVwiKSkge1xuICAgIGNvbnN0IHNlZ3MgPSBrZXlTdHIuc3BsaXQoXCItXCIpO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCBtb2RzID0gW107XG4gICAgd2hpbGUgKGkgPCBzZWdzLmxlbmd0aCAmJiAoc2Vnc1tpXSA9PT0gXCJDXCIgfHwgc2Vnc1tpXSA9PT0gXCJTXCIpKSB7XG4gICAgICBtb2RzLnB1c2goc2Vnc1tpXSk7XG4gICAgICBpKys7XG4gICAgfVxuICAgIGlmIChpIDwgc2Vncy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IGJhc2UgPSBzZWdzW2krK107XG4gICAgICBjb25zdCBmaXJzdCA9IChtb2RzLmxlbmd0aCA/IG1vZHMuam9pbihcIi1cIikgKyBcIi1cIiA6IFwiXCIpICsgYmFzZTtcbiAgICAgIGNvbnN0IHJlc3QgPSBzZWdzLnNsaWNlKGkpO1xuICAgICAgcmV0dXJuIFtmaXJzdCwgLi4ucmVzdF07XG4gICAgfVxuICAgIHJldHVybiBba2V5U3RyXTtcbiAgfVxuXG4gIC8vIEZhbGxiYWNrOiBzcGxpdCBpbnRvIGluZGl2aWR1YWwgY2hhcmFjdGVycyAoZS5nLiwgXCJnZ1wiID0+IFtcImdcIixcImdcIl0pLlxuICByZXR1cm4ga2V5U3RyLnNwbGl0KFwiXCIpO1xufVxuXG5mdW5jdGlvbiBidWlsZENvbW1hbmRUcmllKGNvbW1hbmRzKSB7XG4gIGNvbnN0IHJvb3QgPSB7IGNoaWxkcmVuOiBuZXcgTWFwKCksIGhhbmRsZXI6IG51bGwgfTtcbiAgbGV0IG1heExlbiA9IDE7XG4gIGZvciAoY29uc3QgY21kIG9mIGNvbW1hbmRzKSB7XG4gICAgY29uc3QgdG9rZW5zID0gY29tbWFuZEtleVRvVG9rZW5zKGNtZC5rZXkpO1xuICAgIG1heExlbiA9IE1hdGgubWF4KG1heExlbiwgdG9rZW5zLmxlbmd0aCk7XG4gICAgbGV0IG5vZGUgPSByb290O1xuICAgIGZvciAoY29uc3QgdCBvZiB0b2tlbnMpIHtcbiAgICAgIGlmICghbm9kZS5jaGlsZHJlbi5oYXModCkpXG4gICAgICAgIG5vZGUuY2hpbGRyZW4uc2V0KHQsIHsgY2hpbGRyZW46IG5ldyBNYXAoKSwgaGFuZGxlcjogbnVsbCB9KTtcbiAgICAgIG5vZGUgPSBub2RlLmNoaWxkcmVuLmdldCh0KTtcbiAgICB9XG4gICAgLy8gTGFzdCB0b2tlbjogc3RvcmUgaGFuZGxlclxuICAgIG5vZGUuaGFuZGxlciA9IGNtZC5oYW5kbGVyO1xuICB9XG4gIHJldHVybiB7IHJvb3QsIG1heExlbiB9O1xufVxuXG5jb25zdCB7IHJvb3Q6IENPTU1BTkRfVFJJRSwgbWF4TGVuOiBNQVhfU0VRX0xFTiB9ID0gYnVpbGRDb21tYW5kVHJpZShcbiAgVklNX0NPTU1BTkRTLmltbWVkaWF0ZSxcbik7XG4vLyBJbml0aWFsaXplIHJpbmcgYnVmZmVyIGNhcGFjaXR5IGZyb20gY29tcHV0ZWQgbWF4IGxlbmd0aCAobWluIDEpXG5SQl9DQVAgPSBNYXRoLm1heCgxLCBNQVhfU0VRX0xFTik7XG5yYiA9IG5ldyBBcnJheShSQl9DQVApO1xuXG4vLyA9PT09PT09PT09PT0gUFJJVkFURSBmdW5jdGlvbiA9PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5wdXRGaWVsZChlbGVtZW50KSB7XG4gIHJldHVybiAoXG4gICAgZWxlbWVudCAmJlxuICAgIChlbGVtZW50LnRhZ05hbWUgPT09IFwiSU5QVVRcIiB8fFxuICAgICAgZWxlbWVudC50YWdOYW1lID09PSBcIlRFWFRBUkVBXCIgfHxcbiAgICAgIGVsZW1lbnQuaXNDb250ZW50RWRpdGFibGUpXG4gICk7XG59XG5cbi8vIE5vcm1hbGl6ZSBhIGtleSBldmVudCBpbnRvIGEgdG9rZW4gdGhhdCBpbmNsdWRlcyBDdHJsL1NoaWZ0IHdoZW4gcHJlc2VudC5cbi8vIENhbGxlciBwcmUtY29tcHV0ZXMgd2hldGhlciB0aGlzIGlzIHRoZSBmaXJzdCB0b2tlbiBpbiB0aGUgc2VxdWVuY2UgZm9yIHBlcmYuXG4vLyBFeGFtcGxlczogXCJqXCIsIFwiQy1qXCIsIFwiUy1qXCIsIFwiQy1TLWpcIiwgXCJTLUFycm93RG93blwiXG5mdW5jdGlvbiBub3JtYWxpemVLZXlUb2tlbihlLCBpc0ZpcnN0KSB7XG4gIGNvbnN0IGsgPSBlLmtleTtcblxuICAvLyBJZ25vcmUgc3RhbmRhbG9uZSBtb2RpZmllciBrZXlzXG4gIGlmIChrID09PSBcIlNoaWZ0XCIgfHwgayA9PT0gXCJDb250cm9sXCIgfHwgayA9PT0gXCJBbHRcIiB8fCBrID09PSBcIk1ldGFcIikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gQmFzZSBrZXkgKGxvd2VyY2FzZWQgZm9yIGxldHRlcnMgdG8ga2VlcCB0b2tlbnMgY29uc2lzdGVudClcbiAgbGV0IGJhc2UgPSBrLmxlbmd0aCA9PT0gMSA/IGsudG9Mb3dlckNhc2UoKSA6IGs7XG5cbiAgLy8gRmFzdCBwYXRoOiBub24tZmlyc3QgdG9rZW5zIGlnbm9yZSBtb2RpZmllcnMgKGtlZXBzIHNlcXVlbmNlcyBzbW9vdGgpXG4gIGlmICghaXNGaXJzdCkgcmV0dXJuIGJhc2U7XG5cbiAgLy8gT25seSBlbmNvZGUgbW9kaWZpZXJzIG9uIHRoZSBGSVJTVCB0b2tlbiBvZiBhIHNlcXVlbmNlXG4gIGNvbnN0IG1vZHMgPSBbXTtcbiAgaWYgKGUuY3RybEtleSkgbW9kcy5wdXNoKFwiQ1wiKTtcbiAgaWYgKGUuc2hpZnRLZXkpIG1vZHMucHVzaChcIlNcIik7XG4gIHJldHVybiBtb2RzLmxlbmd0aCA/IG1vZHMuam9pbihcIi1cIikgKyBcIi1cIiArIGJhc2UgOiBiYXNlO1xufVxuXG4vLyBIZWxwZXI6IHJpbmcgYnVmZmVyIG9wZXJhdGlvbnNcbmZ1bmN0aW9uIHJiQ2xlYXIoKSB7XG4gIHJiU3RhcnQgPSAwOyByYlNpemUgPSAwO1xufVxuZnVuY3Rpb24gcmJQdXNoKHRva2VuKSB7XG4gIGlmIChyYlNpemUgPCBSQl9DQVApIHtcbiAgICByYlsocmJTdGFydCArIHJiU2l6ZSkgJSBSQl9DQVBdID0gdG9rZW47XG4gICAgcmJTaXplKys7XG4gIH0gZWxzZSB7XG4gICAgLy8gb3ZlcndyaXRlIG9sZGVzdFxuICAgIHJiW3JiU3RhcnRdID0gdG9rZW47XG4gICAgcmJTdGFydCA9IChyYlN0YXJ0ICsgMSkgJSBSQl9DQVA7XG4gIH1cbn1cbmZ1bmN0aW9uIHJiU2V0TGF0ZXN0KHRva2VuKSB7XG4gIHJiU3RhcnQgPSAwOyByYlNpemUgPSAxOyByYlswXSA9IHRva2VuO1xufVxuXG4vLyBBdHRlbXB0IHRvIG1hdGNoIHRva2VucyBjdXJyZW50bHkgaW4gcmluZyBidWZmZXJcbmZ1bmN0aW9uIGF0dGVtcHRNYXRjaEZyb21SaW5nKCkge1xuICBsZXQgbm9kZSA9IENPTU1BTkRfVFJJRTtcbiAgbGV0IGxhc3RFeGFjdCA9IG51bGw7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcmJTaXplOyBpKyspIHtcbiAgICBjb25zdCB0ID0gcmJbKHJiU3RhcnQgKyBpKSAlIFJCX0NBUF07XG4gICAgY29uc3QgbmV4dCA9IG5vZGUuY2hpbGRyZW4uZ2V0KHQpO1xuICAgIGlmICghbmV4dCkge1xuICAgICAgcmV0dXJuIHsgdHlwZTogXCJub25lXCIsIGxhc3RFeGFjdCB9O1xuICAgIH1cbiAgICBub2RlID0gbmV4dDtcbiAgICBpZiAobm9kZS5oYW5kbGVyKSBsYXN0RXhhY3QgPSB7IGhhbmRsZXI6IG5vZGUuaGFuZGxlciwgZGVwdGg6IGkgKyAxIH07XG4gIH1cbiAgaWYgKG5vZGUuaGFuZGxlcikgcmV0dXJuIHsgdHlwZTogXCJleGFjdFwiLCBoYW5kbGVyOiBub2RlLmhhbmRsZXIsIGhhc0NoaWxkcmVuOiBub2RlLmNoaWxkcmVuLnNpemUgPiAwIH07XG4gIGlmIChub2RlLmNoaWxkcmVuLnNpemUgPiAwKSByZXR1cm4geyB0eXBlOiBcInByZWZpeFwiLCBsYXN0RXhhY3QgfTtcbiAgcmV0dXJuIHsgdHlwZTogXCJub25lXCIsIGxhc3RFeGFjdCB9O1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIGtleSB3YXMgaGFuZGxlZCAoZXhhY3Qgb3IgcHJlZml4IG1hdGNoKSwgZmFsc2Ugb3RoZXJ3aXNlXG5jb25zdCBub3JtYWxNb2RlSGFuZGxlciA9IChlKSA9PiB7XG4gIC8vIFByZS1jb21wdXRlIFwiaXMgZmlyc3QgdG9rZW5cIiBzbyBub3JtYWxpemVyIGNhbiB0YWtlIHRoZSBmYXN0IHBhdGhcbiAgY29uc3QgdG9rZW4gPSBub3JtYWxpemVLZXlUb2tlbihlLCByYlNpemUgPT09IDApO1xuICBpZiAoIXRva2VuKSByZXR1cm4gZmFsc2U7IC8vIGlnbm9yZWQgKHB1cmUgbW9kaWZpZXIpXG5cbiAgLy8gQXBwZW5kIHRva2VuIChyaW5nIGJ1ZmZlcilcbiAgcmJQdXNoKHRva2VuKTtcblxuICAvLyBUcnkgdG8gbWF0Y2ggdGhlIGN1cnJlbnQgYnVmZmVyXG4gIGxldCByZXN1bHQgPSBhdHRlbXB0TWF0Y2hGcm9tUmluZygpO1xuXG4gIGlmIChyZXN1bHQudHlwZSA9PT0gXCJleGFjdFwiKSB7XG4gICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIHNlcXVlbmNlIHRpbWVyXG4gIGlmIChzZXFUaW1lcklkKSB7IGNsZWFyVGltZW91dChzZXFUaW1lcklkKTsgc2VxVGltZXJJZCA9IG51bGw7IH1cbiAgc2VxU3RhdGUgPSBTRVFVRU5DRV9TVEFURS5JRExFO1xuICAgIHNlcUhhbmRsZXIgPSBudWxsO1xuXG4gICAgLy8gSWYgdGhpcyBleGFjdCBhbHNvIGhhcyBjaGlsZHJlbiwgZGVsYXkgZXhlY3V0aW9uIHRvIGFsbG93IGxvbmdlciBtYXBwaW5nXG4gICAgaWYgKHJlc3VsdC5oYXNDaGlsZHJlbikge1xuICAgICAgc2VxU3RhdGUgPSBTRVFVRU5DRV9TVEFURS5QRU5ESU5HX0VYQUNUO1xuICAgICAgc2VxSGFuZGxlciA9IHJlc3VsdC5oYW5kbGVyO1xuICAgICAgc2VxVGltZXJJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoc2VxU3RhdGUgPT09IFNFUVVFTkNFX1NUQVRFLlBFTkRJTkdfRVhBQ1QgJiYgc2VxSGFuZGxlcikge1xuICAgICAgICAgIHRyeSB7IHNlcUhhbmRsZXIoKTsgfSBjYXRjaCAoXykge31cbiAgICAgICAgfVxuICAgICAgICByYkNsZWFyKCk7XG4gICAgICAgIHNlcVN0YXRlID0gU0VRVUVOQ0VfU1RBVEUuSURMRTtcbiAgICAgICAgc2VxSGFuZGxlciA9IG51bGw7XG4gICAgICAgIHNlcVRpbWVySWQgPSBudWxsO1xuICAgICAgfSwgVElNRU9VVCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gTm8gY2hpbGRyZW46IGV4ZWN1dGUgaW1tZWRpYXRlbHlcbiAgICB0cnkgeyByZXN1bHQuaGFuZGxlcihlKTsgfSBjYXRjaCAoXykge31cbiAgICByYkNsZWFyKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAocmVzdWx0LnR5cGUgPT09IFwicHJlZml4XCIpIHtcbiAgICAvLyBXYWl0IGZvciBtb3JlIHRva2VuczsgcmVtZW1iZXIgbGFzdEV4YWN0IChpZiBhbnkpIHRvIHJ1biBvbiB0aW1lb3V0XG4gICAgaWYgKHNlcVRpbWVySWQpIHsgY2xlYXJUaW1lb3V0KHNlcVRpbWVySWQpOyBzZXFUaW1lcklkID0gbnVsbDsgfVxuICAgIGNvbnN0IGxhc3RFeGFjdCA9IHJlc3VsdC5sYXN0RXhhY3Q7IC8vIG1heSBiZSBudWxsXG4gICAgc2VxU3RhdGUgPSBTRVFVRU5DRV9TVEFURS5QUkVGSVg7XG4gICAgc2VxSGFuZGxlciA9IGxhc3RFeGFjdD8uaGFuZGxlciB8fCBudWxsO1xuICAgIHNlcVRpbWVySWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmIChzZXFTdGF0ZSA9PT0gU0VRVUVOQ0VfU1RBVEUuUFJFRklYICYmIHNlcUhhbmRsZXIpIHtcbiAgICAgICAgdHJ5IHsgc2VxSGFuZGxlcigpOyB9IGNhdGNoIChfKSB7fVxuICAgICAgfVxuICAgICAgcmJDbGVhcigpO1xuICAgICAgc2VxU3RhdGUgPSBTRVFVRU5DRV9TVEFURS5JRExFO1xuICAgICAgc2VxSGFuZGxlciA9IG51bGw7XG4gICAgICBzZXFUaW1lcklkID0gbnVsbDtcbiAgICB9LCBUSU1FT1VUKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIE5vIG1hdGNoIHdpdGggY3VycmVudCBidWZmZXI7IHRyeSB3aXRoIG9ubHkgdGhlIGxhdGVzdCB0b2tlblxuICAvLyBJZiB3ZSBoYWQgYSBwZW5kaW5nIGV4YWN0IHdhaXRpbmcgZm9yIGNvbnRpbnVhdGlvbiwgZmx1c2ggaXQgaW1tZWRpYXRlbHkgb24gZGl2ZXJnZW5jZVxuICBpZiAoc2VxU3RhdGUgPT09IFNFUVVFTkNFX1NUQVRFLlBFTkRJTkdfRVhBQ1QgJiYgc2VxSGFuZGxlcikge1xuICAgIGlmIChzZXFUaW1lcklkKSB7IGNsZWFyVGltZW91dChzZXFUaW1lcklkKTsgc2VxVGltZXJJZCA9IG51bGw7IH1cbiAgICB0cnkgeyBzZXFIYW5kbGVyKCk7IH0gY2F0Y2ggKF8pIHt9XG4gICAgc2VxU3RhdGUgPSBTRVFVRU5DRV9TVEFURS5JRExFO1xuICAgIHNlcUhhbmRsZXIgPSBudWxsO1xuICB9XG5cbiAgcmJTZXRMYXRlc3QodG9rZW4pO1xuICByZXN1bHQgPSBhdHRlbXB0TWF0Y2hGcm9tUmluZygpO1xuICBpZiAocmVzdWx0LnR5cGUgPT09IFwiZXhhY3RcIikge1xuICAgIGlmIChzZXFUaW1lcklkKSB7IGNsZWFyVGltZW91dChzZXFUaW1lcklkKTsgc2VxVGltZXJJZCA9IG51bGw7IH1cbiAgICBzZXFTdGF0ZSA9IFNFUVVFTkNFX1NUQVRFLklETEU7XG4gICAgc2VxSGFuZGxlciA9IG51bGw7XG4gICAgLy8gSWYgdGhpcyBleGFjdCBhbHNvIGhhcyBjaGlsZHJlbiwgZGVsYXkgZXhlY3V0aW9uXG4gICAgaWYgKHJlc3VsdC5oYXNDaGlsZHJlbikge1xuICAgICAgc2VxU3RhdGUgPSBTRVFVRU5DRV9TVEFURS5QRU5ESU5HX0VYQUNUO1xuICAgICAgc2VxSGFuZGxlciA9IHJlc3VsdC5oYW5kbGVyO1xuICAgICAgc2VxVGltZXJJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoc2VxU3RhdGUgPT09IFNFUVVFTkNFX1NUQVRFLlBFTkRJTkdfRVhBQ1QgJiYgc2VxSGFuZGxlcikge1xuICAgICAgICAgIHRyeSB7IHNlcUhhbmRsZXIoKTsgfSBjYXRjaCAoXykge31cbiAgICAgICAgfVxuICAgICAgICByYkNsZWFyKCk7XG4gICAgICAgIHNlcVN0YXRlID0gU0VRVUVOQ0VfU1RBVEUuSURMRTtcbiAgICAgICAgc2VxSGFuZGxlciA9IG51bGw7XG4gICAgICAgIHNlcVRpbWVySWQgPSBudWxsO1xuICAgICAgfSwgVElNRU9VVCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdHJ5IHsgcmVzdWx0LmhhbmRsZXIoZSk7IH0gY2F0Y2ggKF8pIHt9XG4gICAgcmJDbGVhcigpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChyZXN1bHQudHlwZSA9PT0gXCJwcmVmaXhcIikge1xuICAgIGlmIChzZXFUaW1lcklkKSB7IGNsZWFyVGltZW91dChzZXFUaW1lcklkKTsgc2VxVGltZXJJZCA9IG51bGw7IH1cbiAgICBzZXFTdGF0ZSA9IFNFUVVFTkNFX1NUQVRFLlBSRUZJWDtcbiAgICBzZXFIYW5kbGVyID0gbnVsbDsgLy8gbm8gc2hvcnRlciBleGFjdCBrbm93biBoZXJlXG4gICAgc2VxVGltZXJJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKHNlcVN0YXRlID09PSBTRVFVRU5DRV9TVEFURS5QUkVGSVggJiYgc2VxSGFuZGxlcikge1xuICAgICAgICB0cnkgeyBzZXFIYW5kbGVyKCk7IH0gY2F0Y2ggKF8pIHt9XG4gICAgICB9XG4gICAgICByYkNsZWFyKCk7XG4gICAgICBzZXFTdGF0ZSA9IFNFUVVFTkNFX1NUQVRFLklETEU7XG4gICAgICBzZXFIYW5kbGVyID0gbnVsbDtcbiAgICAgIHNlcVRpbWVySWQgPSBudWxsO1xuICAgIH0sIFRJTUVPVVQpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gU3RpbGwgbm8gbWF0Y2hcbiAgaWYgKHNlcVRpbWVySWQpIHsgY2xlYXJUaW1lb3V0KHNlcVRpbWVySWQpOyBzZXFUaW1lcklkID0gbnVsbDsgfVxuICBzZXFTdGF0ZSA9IFNFUVVFTkNFX1NUQVRFLklETEU7XG4gIHNlcUhhbmRsZXIgPSBudWxsO1xuICByYkNsZWFyKCk7XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbmNvbnN0IGluc2VydE1vZGVIYW5kbGVyID0gKGUpID0+IHtcbiAgaWYgKGUua2V5ID09PSBcIkVzY2FwZVwiKSB7XG4gICAgY3VycmVudFZpbU1vZGUgPSBWSU1fTU9ERVMuTk9STUFMO1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZUtleWRvd24gPSAoZSkgPT4ge1xuICBzd2l0Y2ggKGN1cnJlbnRWaW1Nb2RlKSB7XG4gICAgY2FzZSBWSU1fTU9ERVMuTk9STUFMOiB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAvLyBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgLy8gZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgIG5vcm1hbE1vZGVIYW5kbGVyKGUpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNhc2UgVklNX01PREVTLklOU0VSVDpcbiAgICAgIGluc2VydE1vZGVIYW5kbGVyKGUpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUud2FybihcIlVuZXhwZWN0ZWQgbW9kZTpcIiwgY3VycmVudFZpbU1vZGUpO1xuICAgICAgYnJlYWs7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVDbGljayA9IChlKSA9PiB7XG4gIHN3aXRjaCAoY3VycmVudFZpbU1vZGUpIHtcbiAgICBjYXNlIFZJTV9NT0RFUy5OT1JNQUw6IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0O1xuICAgICAgaWYgKGlzSW5wdXRGaWVsZCh0YXJnZXQpKSB7XG4gICAgICAgIGN1cnJlbnRWaW1Nb2RlID0gVklNX01PREVTLklOU0VSVDtcbiAgICAgIH1cbiAgICB9XG4gICAgY2FzZSBWSU1fTU9ERVMuSU5TRVJUOlxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUud2FybihcIlVuZXhwZWN0ZWQgbW9kZTpcIiwgY3VycmVudFZpbU1vZGUpO1xuICAgICAgYnJlYWs7XG4gIH1cbn07XG4iLCAiLy8gVGlueSwgaWRlbXBvdGVudCBib290c3RyYXAgdGhhdCBsYXp5LWxvYWRzIERPTSBsb2dpYyBvbiBmaXJzdCB1c2UuXG5pbXBvcnQgeyBoYW5kbGVLZXlkb3duLCBoYW5kbGVDbGljaywgY3VycmVudFZpbU1vZGUgfSBmcm9tIFwiLi92aW1fbW9kZS5qc1wiO1xuXG5jb25zdCBCT09UU1RSQVBfRkxBRyA9IFwiX193ZXJfYm9vdHN0cmFwX2luc3RhbGxlZFwiO1xuXG4vLyBQcmV2ZW50IGR1cGxpY2F0ZSBpbnN0YWxscyAoU1BBcywgYmZjYWNoZSwgcmUtaW5qZWN0aW9uKVxuaWYgKCFnbG9iYWxUaGlzW0JPT1RTVFJBUF9GTEFHXSkge1xuICBnbG9iYWxUaGlzW0JPT1RTVFJBUF9GTEFHXSA9IHRydWU7XG4gIGNvbnNvbGUubG9nKFwiRGVmYXVsdCBtb2RlOiBcIiArIGN1cnJlbnRWaW1Nb2RlKTtcblxuICAvLyBWaW0ga2V5ZG93biBoYW5kbGVyIGlzIGltcG9ydGVkIGZyb20gdmltX21vZGUuanNcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgaGFuZGxlS2V5ZG93biwgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgaGFuZGxlQ2xpY2ssIHsgY2FwdHVyZTogdHJ1ZSB9KTtcblxuICAvLyBMYXp5LWxvYWQgdmltX2Rpc3BsYXkgYWZ0ZXIgZmlyc3QgaW50ZXJhY3Rpb24sIHRoZW4ga2VlcCBpdCBpbiBzeW5jXG4gIGxldCBfX3ZpbURpc3BsYXlMb2FkZWQgPSBmYWxzZTtcbiAgbGV0IF9fdmltRGlzcGxheU1vZFByb21pc2UgPSBudWxsO1xuICBjb25zdCBsb2FkVmltRGlzcGxheSA9IGFzeW5jICgpID0+IHtcbiAgICBpZiAoX192aW1EaXNwbGF5TG9hZGVkKSByZXR1cm4gX192aW1EaXNwbGF5TW9kUHJvbWlzZTtcbiAgICBpZiAoIV9fdmltRGlzcGxheU1vZFByb21pc2UpIHtcbiAgICAgIGNvbnN0IHVybCA9IChnbG9iYWxUaGlzLmNocm9tZSAmJiBjaHJvbWUucnVudGltZSAmJiBjaHJvbWUucnVudGltZS5nZXRVUkwpXG4gICAgICAgID8gY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKFwianMvZGlzdC92aW1fZGlzcGxheS5qc1wiKVxuICAgICAgICA6IFwiL2pzL2Rpc3QvdmltX2Rpc3BsYXkuanNcIjsgLy8gZmFsbGJhY2sgcGF0aCBmb3IgZGV2IHN0YXRpYyBzZXJ2aW5nXG4gICAgICBfX3ZpbURpc3BsYXlNb2RQcm9taXNlID0gaW1wb3J0KHVybCkudGhlbigobW9kKSA9PiB7XG4gICAgICAgIHRyeSB7IG1vZC5pbml0VmltRGlzcGxheT8uKCk7IH0gY2F0Y2ggKF8pIHt9XG4gICAgICAgIF9fdmltRGlzcGxheUxvYWRlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBtb2Q7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIF9fdmltRGlzcGxheU1vZFByb21pc2U7XG4gIH07XG5cbiAgLy8gVXBkYXRlIEFGVEVSIHZpbSBoYW5kbGVycyBydW4gKGJ1YmJsZSBwaGFzZSkuIFRyaWdnZXJzIGxhenkgbG9hZCBvbiBmaXJzdCBldmVudC5cbiAgY29uc3Qgc3luY09uS2V5ZG93biA9ICgpID0+IHsgbG9hZFZpbURpc3BsYXkoKS50aGVuKChtKSA9PiBtLnN5bmNWaW1EaXNwbGF5Py4oY3VycmVudFZpbU1vZGUpKTsgfTtcbiAgY29uc3Qgc3luY09uQ2xpY2sgPSAoKSA9PiB7IGxvYWRWaW1EaXNwbGF5KCkudGhlbigobSkgPT4gbS5zeW5jVmltRGlzcGxheT8uKGN1cnJlbnRWaW1Nb2RlKSk7IH07XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHN5bmNPbktleWRvd24sIHsgY2FwdHVyZTogZmFsc2UgfSk7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBzeW5jT25DbGljaywgeyBjYXB0dXJlOiBmYWxzZSB9KTtcblxuICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoYXN5bmMgKG1zZykgPT4ge1xuICAgIGlmIChtc2c/LmFjdGlvbiA9PT0gXCJjbGVhbnVwXCIpIHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGhhbmRsZUtleWRvd24sIHsgY2FwdHVyZTogdHJ1ZSB9KTtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBoYW5kbGVDbGljaywgeyBjYXB0dXJlOiB0cnVlIH0pO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgc3luY09uS2V5ZG93biwgeyBjYXB0dXJlOiBmYWxzZSB9KTtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBzeW5jT25DbGljaywgeyBjYXB0dXJlOiBmYWxzZSB9KTtcbiAgICAgIC8vIENsZWFuIHVwIHRoZSBVSSBpZiBpdCB3YXMgbG9hZGVkXG4gICAgICBpZiAoX192aW1EaXNwbGF5TG9hZGVkKSB7XG4gICAgICAgIF9fdmltRGlzcGxheU1vZFByb21pc2U/LnRoZW4oKG0pID0+IG0uY2xlYW51cFZpbURpc3BsYXk/LigpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7QUFBTyxNQUFJLGlCQUFpQjtBQUc1QixNQUFNLFlBQVk7QUFBQSxJQUNoQixRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsRUFDVjtBQUVBLE1BQU0sY0FBYztBQUNwQixNQUFNLG1CQUFtQjtBQUV6QixNQUFNLGVBQWU7QUFBQSxJQUNuQixXQUFXO0FBQUEsTUFDVDtBQUFBLFFBQ0UsS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sYUFBYTtBQUFBLFFBQ2IsU0FBUyxNQUFNO0FBQ2IsMkJBQWlCLFVBQVU7QUFDM0IsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLE1BQ0E7QUFBQSxRQUNFLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLGFBQWE7QUFBQSxRQUNiLFNBQVMsQ0FBQyxRQUFRO0FBQ2hCLGdCQUFNLFdBQVcsQ0FBQyxDQUFDLEtBQUs7QUFDeEIsZ0JBQU0sT0FBTyxXQUNULEtBQUssSUFBSSxHQUFHLGNBQWMsZ0JBQWdCLElBQzFDO0FBQ0osZ0JBQU0sV0FBVyxXQUFXLFNBQVM7QUFDckMsaUJBQU8sU0FBUyxFQUFFLE1BQU0sQ0FBQyxNQUFNLFNBQVMsQ0FBQztBQUN6QyxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsTUFDQTtBQUFBLFFBQ0UsS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04s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
