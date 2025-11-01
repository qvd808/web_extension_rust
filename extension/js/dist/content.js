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
  var RB_CAP = 2;
  var rb = new Array(2);
  var rbStart = 0;
  var rbSize = 0;
  var timeoutId = null;
  var TIMEOUT = 500;
  var pendingExact = null;
  var pendingTimerId = null;
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
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (result.hasChildren) {
        pendingExact = result.handler;
        if (pendingTimerId) clearTimeout(pendingTimerId);
        pendingTimerId = setTimeout(() => {
          try {
            pendingExact && pendingExact();
          } catch (_) {
          }
          pendingExact = null;
          pendingTimerId = null;
          rbClear();
        }, TIMEOUT);
        return true;
      }
      if (pendingTimerId) {
        clearTimeout(pendingTimerId);
        pendingTimerId = null;
      }
      pendingExact = null;
      result.handler(e);
      rbClear();
      return true;
    }
    if (result.type === "prefix") {
      if (timeoutId) clearTimeout(timeoutId);
      const lastExact = result.lastExact;
      timeoutId = setTimeout(() => {
        if (lastExact?.handler) {
          try {
            lastExact.handler();
          } catch (_) {
          }
        }
        rbClear();
        timeoutId = null;
      }, TIMEOUT);
      return true;
    }
    if (pendingExact) {
      if (pendingTimerId) {
        clearTimeout(pendingTimerId);
        pendingTimerId = null;
      }
      try {
        pendingExact();
      } catch (_) {
      }
      pendingExact = null;
    }
    rbSetLatest(token);
    result = attemptMatchFromRing();
    if (result.type === "exact") {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (result.hasChildren) {
        pendingExact = result.handler;
        if (pendingTimerId) clearTimeout(pendingTimerId);
        pendingTimerId = setTimeout(() => {
          try {
            pendingExact && pendingExact();
          } catch (_) {
          }
          pendingExact = null;
          pendingTimerId = null;
          rbClear();
        }, TIMEOUT);
        return true;
      }
      if (pendingTimerId) {
        clearTimeout(pendingTimerId);
        pendingTimerId = null;
      }
      pendingExact = null;
      result.handler(e);
      rbClear();
      return true;
    }
    if (result.type === "prefix") {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        rbClear();
        timeoutId = null;
      }, TIMEOUT);
      return true;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3ZpbV9tb2RlLmpzIiwgIi4uL3NyYy9tYWluLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgbGV0IGN1cnJlbnRWaW1Nb2RlID0gXCJub3JtYWxcIjtcblxuLy8gPT09PT09PT09PT09IFBSSVZBVEUgVkFSSUFCTEUgPT09PT09PT09PT09PT09XG5jb25zdCBWSU1fTU9ERVMgPSB7XG4gIE5PUk1BTDogXCJub3JtYWxcIixcbiAgSU5TRVJUOiBcImluc2VydFwiLFxuICBWSVNVQUw6IFwidmlzdWFsXCIsXG59O1xuXG5jb25zdCBTQ1JPTExfU1RFUCA9IDgwO1xuY29uc3QgQVVUT19TQ1JPTExfRUFTRSA9IDEwO1xuXG5jb25zdCBWSU1fQ09NTUFORFMgPSB7XG4gIGltbWVkaWF0ZTogW1xuICAgIHtcbiAgICAgIGtleTogXCJpXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiRW50ZXIgaW5zZXJ0IG1vZGVcIixcbiAgICAgIGhhbmRsZXI6ICgpID0+IHtcbiAgICAgICAgY3VycmVudFZpbU1vZGUgPSBWSU1fTU9ERVMuSU5TRVJUO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwiaFwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlNjcm9sbCBsZWZ0XCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGlzUmVwZWF0ID0gISFldnQ/LnJlcGVhdDtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0XG4gICAgICAgICAgPyBNYXRoLm1heCgxLCBTQ1JPTExfU1RFUCAtIEFVVE9fU0NST0xMX0VBU0UpXG4gICAgICAgICAgOiBTQ1JPTExfU1RFUDtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgbGVmdDogLXN0ZXAsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwialwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlNjcm9sbCBkb3duXCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGlzUmVwZWF0ID0gISFldnQ/LnJlcGVhdDtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0XG4gICAgICAgICAgPyBNYXRoLm1heCgxLCBTQ1JPTExfU1RFUCAtIEFVVE9fU0NST0xMX0VBU0UpXG4gICAgICAgICAgOiBTQ1JPTExfU1RFUDtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgdG9wOiBzdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcImtcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJTY3JvbGwgdXBcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBzdGVwID0gaXNSZXBlYXRcbiAgICAgICAgICA/IE1hdGgubWF4KDEsIFNDUk9MTF9TVEVQIC0gQVVUT19TQ1JPTExfRUFTRSlcbiAgICAgICAgICA6IFNDUk9MTF9TVEVQO1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGlzUmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoeyB0b3A6IC1zdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcImxcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJTY3JvbGwgcmlnaHRcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBzdGVwID0gaXNSZXBlYXRcbiAgICAgICAgICA/IE1hdGgubWF4KDEsIFNDUk9MTF9TVEVQIC0gQVVUT19TQ1JPTExfRUFTRSlcbiAgICAgICAgICA6IFNDUk9MTF9TVEVQO1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGlzUmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoeyBsZWZ0OiBzdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcIkMtalwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkN0cmwrSiBleGFtcGxlXCIsXG4gICAgICBoYW5kbGVyOiAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXhlY3V0ZSBDdHJsICsgalwiKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBbXCJDLWpcIiwgXCJqXCJdLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkRlbW86IEN0cmwrSiB0aGVuIGpcIixcbiAgICAgIGhhbmRsZXI6ICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFeGVjdXRlIEN0cmwgKyBqLCB0aGVuIGpcIik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogW1wiQy1qXCIsIFwia1wiXSxcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJEZW1vOiBDdHJsK0ogdGhlbiBDdHJsK0tcIixcbiAgICAgIGhhbmRsZXI6ICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJFeGVjdXRlIEN0cmwgKyBqLCB0aGVuIGtcIik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogXCJDLWRcIixcbiAgICAgIG1vZGU6IFwibm9ybWFsXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJQYWdlIGRvd25cIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBwYWdlID0gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcih3aW5kb3cuaW5uZXJIZWlnaHQgKiAwLjkpKTtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0ID8gTWF0aC5tYXgoMSwgcGFnZSAtIEFVVE9fU0NST0xMX0VBU0UpIDogcGFnZTtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgdG9wOiBzdGVwLCBiZWhhdmlvciB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAga2V5OiBcIkMtdVwiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlBhZ2UgdXBcIixcbiAgICAgIGhhbmRsZXI6IChldnQpID0+IHtcbiAgICAgICAgY29uc3QgaXNSZXBlYXQgPSAhIWV2dD8ucmVwZWF0O1xuICAgICAgICBjb25zdCBwYWdlID0gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcih3aW5kb3cuaW5uZXJIZWlnaHQgKiAwLjkpKTtcbiAgICAgICAgY29uc3Qgc3RlcCA9IGlzUmVwZWF0ID8gTWF0aC5tYXgoMSwgcGFnZSAtIEFVVE9fU0NST0xMX0VBU0UpIDogcGFnZTtcbiAgICAgICAgY29uc3QgYmVoYXZpb3IgPSBpc1JlcGVhdCA/IFwiYXV0b1wiIDogXCJzbW9vdGhcIjtcbiAgICAgICAgd2luZG93LnNjcm9sbEJ5KHsgdG9wOiAtc3RlcCwgYmVoYXZpb3IgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIGtleTogXCJnZ1wiLFxuICAgICAgbW9kZTogXCJub3JtYWxcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkdvIHRvIHRvcCBvZiBkb2N1bWVudFwiLFxuICAgICAgaGFuZGxlcjogKGV2dCkgPT4ge1xuICAgICAgICBjb25zdCBiZWhhdmlvciA9IGV2dD8ucmVwZWF0ID8gXCJhdXRvXCIgOiBcInNtb290aFwiO1xuICAgICAgICB3aW5kb3cuc2Nyb2xsVG8oeyB0b3A6IDAsIGJlaGF2aW9yIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICBrZXk6IFwiUy1nXCIsXG4gICAgICBtb2RlOiBcIm5vcm1hbFwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiR28gdG8gYm90dG9tIG9mIGRvY3VtZW50XCIsXG4gICAgICBoYW5kbGVyOiAoZXZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IGJlaGF2aW9yID0gZXZ0Py5yZXBlYXQgPyBcImF1dG9cIiA6IFwic21vb3RoXCI7XG4gICAgICAgIGNvbnN0IGRvYyA9XG4gICAgICAgICAgZG9jdW1lbnQuc2Nyb2xsaW5nRWxlbWVudCB8fFxuICAgICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCB8fFxuICAgICAgICAgIGRvY3VtZW50LmJvZHk7XG4gICAgICAgIHdpbmRvdy5zY3JvbGxUbyh7IHRvcDogZG9jLnNjcm9sbEhlaWdodCwgYmVoYXZpb3IgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICB9LFxuICBdLFxufTtcblxuLy8gU2VxdWVuY2UgbWF0Y2hpbmcgc3RhdGUgKHByZWZpeCB0cmllIGJhc2VkKVxuLy8gVXNlIGEgdGlueSByaW5nIGJ1ZmZlciB0byBhdm9pZCBhbGxvY2F0aW9ucyBhbmQgc2hpZnRzLlxubGV0IFJCX0NBUCA9IDI7IC8vIHdpbGwgYmUgc2V0IGZyb20gTUFYX1NFUV9MRU4gYWZ0ZXIgdHJpZSBidWlsZFxubGV0IHJiID0gbmV3IEFycmF5KDIpO1xubGV0IHJiU3RhcnQgPSAwOyAvLyBpbmRleCBvZiBvbGRlc3RcbmxldCByYlNpemUgPSAwOyAgLy8gbnVtYmVyIG9mIHZhbGlkIHRva2Vuc1xubGV0IHRpbWVvdXRJZCA9IG51bGw7XG5jb25zdCBUSU1FT1VUID0gNTAwO1xuLy8gUGVuZGluZyBleGFjdCB3aGVuIGFsc28gYSBwcmVmaXggKGUuZy4sIHN1cHBvcnRzIGxvbmdlciBtYXBwaW5nIGxpa2UgXCJDLWogalwiKVxubGV0IHBlbmRpbmdFeGFjdCA9IG51bGw7IC8vIGZ1bmN0aW9uIHwgbnVsbFxubGV0IHBlbmRpbmdUaW1lcklkID0gbnVsbDtcblxuLy8gQnVpbGQgYSB0aW55IHByZWZpeCB0cmllIGZvciBmYXN0IG1hdGNoaW5nXG5mdW5jdGlvbiBjb21tYW5kS2V5VG9Ub2tlbnMoa2V5KSB7XG4gIC8vIEFsbG93IGFycmF5IGZvcm0gZGlyZWN0bHksIGUuZy4sIFtcIkMtalwiLCBcImpcIl1cbiAgaWYgKEFycmF5LmlzQXJyYXkoa2V5KSkgcmV0dXJuIGtleS5zbGljZSgpO1xuICBjb25zdCBrZXlTdHIgPSBTdHJpbmcoa2V5KTtcbiAgLy8gU3BhY2UtZGVsaW1pdGVkIHRva2VucywgZS5nLiwgXCJDLWogalwiID0+IFtcIkMtalwiLFwialwiXVxuICBpZiAoa2V5U3RyLmluY2x1ZGVzKFwiIFwiKSkgcmV0dXJuIGtleVN0ci50cmltKCkuc3BsaXQoL1xccysvKTtcblxuICAvLyBIeXBoZW4gaGFuZGxpbmc6IHRyZWF0IGxlYWRpbmcgbW9kaWZpZXJzIChDLCBTKSBhcyBwYXJ0IG9mIGZpcnN0IHRva2VuIG9ubHkuXG4gIC8vIEV4YW1wbGU6IFwiQy1qLWpcIiA9PiBbXCJDLWpcIiwgXCJqXCJdIDsgXCJDLVMtai1nXCIgPT4gW1wiQy1TLWpcIiwgXCJnXCJdXG4gIGlmIChrZXlTdHIuaW5jbHVkZXMoXCItXCIpKSB7XG4gICAgY29uc3Qgc2VncyA9IGtleVN0ci5zcGxpdChcIi1cIik7XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IG1vZHMgPSBbXTtcbiAgICB3aGlsZSAoaSA8IHNlZ3MubGVuZ3RoICYmIChzZWdzW2ldID09PSBcIkNcIiB8fCBzZWdzW2ldID09PSBcIlNcIikpIHtcbiAgICAgIG1vZHMucHVzaChzZWdzW2ldKTtcbiAgICAgIGkrKztcbiAgICB9XG4gICAgaWYgKGkgPCBzZWdzLmxlbmd0aCkge1xuICAgICAgY29uc3QgYmFzZSA9IHNlZ3NbaSsrXTtcbiAgICAgIGNvbnN0IGZpcnN0ID0gKG1vZHMubGVuZ3RoID8gbW9kcy5qb2luKFwiLVwiKSArIFwiLVwiIDogXCJcIikgKyBiYXNlO1xuICAgICAgY29uc3QgcmVzdCA9IHNlZ3Muc2xpY2UoaSk7XG4gICAgICByZXR1cm4gW2ZpcnN0LCAuLi5yZXN0XTtcbiAgICB9XG4gICAgcmV0dXJuIFtrZXlTdHJdO1xuICB9XG5cbiAgLy8gRmFsbGJhY2s6IHNwbGl0IGludG8gaW5kaXZpZHVhbCBjaGFyYWN0ZXJzIChlLmcuLCBcImdnXCIgPT4gW1wiZ1wiLFwiZ1wiXSkuXG4gIHJldHVybiBrZXlTdHIuc3BsaXQoXCJcIik7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkQ29tbWFuZFRyaWUoY29tbWFuZHMpIHtcbiAgY29uc3Qgcm9vdCA9IHsgY2hpbGRyZW46IG5ldyBNYXAoKSwgaGFuZGxlcjogbnVsbCB9O1xuICBsZXQgbWF4TGVuID0gMTtcbiAgZm9yIChjb25zdCBjbWQgb2YgY29tbWFuZHMpIHtcbiAgICBjb25zdCB0b2tlbnMgPSBjb21tYW5kS2V5VG9Ub2tlbnMoY21kLmtleSk7XG4gICAgbWF4TGVuID0gTWF0aC5tYXgobWF4TGVuLCB0b2tlbnMubGVuZ3RoKTtcbiAgICBsZXQgbm9kZSA9IHJvb3Q7XG4gICAgZm9yIChjb25zdCB0IG9mIHRva2Vucykge1xuICAgICAgaWYgKCFub2RlLmNoaWxkcmVuLmhhcyh0KSlcbiAgICAgICAgbm9kZS5jaGlsZHJlbi5zZXQodCwgeyBjaGlsZHJlbjogbmV3IE1hcCgpLCBoYW5kbGVyOiBudWxsIH0pO1xuICAgICAgbm9kZSA9IG5vZGUuY2hpbGRyZW4uZ2V0KHQpO1xuICAgIH1cbiAgICAvLyBMYXN0IHRva2VuOiBzdG9yZSBoYW5kbGVyXG4gICAgbm9kZS5oYW5kbGVyID0gY21kLmhhbmRsZXI7XG4gIH1cbiAgcmV0dXJuIHsgcm9vdCwgbWF4TGVuIH07XG59XG5cbmNvbnN0IHsgcm9vdDogQ09NTUFORF9UUklFLCBtYXhMZW46IE1BWF9TRVFfTEVOIH0gPSBidWlsZENvbW1hbmRUcmllKFxuICBWSU1fQ09NTUFORFMuaW1tZWRpYXRlLFxuKTtcbi8vIEluaXRpYWxpemUgcmluZyBidWZmZXIgY2FwYWNpdHkgZnJvbSBjb21wdXRlZCBtYXggbGVuZ3RoIChtaW4gMSlcblJCX0NBUCA9IE1hdGgubWF4KDEsIE1BWF9TRVFfTEVOKTtcbnJiID0gbmV3IEFycmF5KFJCX0NBUCk7XG5cbi8vID09PT09PT09PT09PSBQUklWQVRFIGZ1bmN0aW9uID09PT09PT09PT09PT09PVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbnB1dEZpZWxkKGVsZW1lbnQpIHtcbiAgcmV0dXJuIChcbiAgICBlbGVtZW50ICYmXG4gICAgKGVsZW1lbnQudGFnTmFtZSA9PT0gXCJJTlBVVFwiIHx8XG4gICAgICBlbGVtZW50LnRhZ05hbWUgPT09IFwiVEVYVEFSRUFcIiB8fFxuICAgICAgZWxlbWVudC5pc0NvbnRlbnRFZGl0YWJsZSlcbiAgKTtcbn1cblxuLy8gTm9ybWFsaXplIGEga2V5IGV2ZW50IGludG8gYSB0b2tlbiB0aGF0IGluY2x1ZGVzIEN0cmwvU2hpZnQgd2hlbiBwcmVzZW50LlxuLy8gQ2FsbGVyIHByZS1jb21wdXRlcyB3aGV0aGVyIHRoaXMgaXMgdGhlIGZpcnN0IHRva2VuIGluIHRoZSBzZXF1ZW5jZSBmb3IgcGVyZi5cbi8vIEV4YW1wbGVzOiBcImpcIiwgXCJDLWpcIiwgXCJTLWpcIiwgXCJDLVMtalwiLCBcIlMtQXJyb3dEb3duXCJcbmZ1bmN0aW9uIG5vcm1hbGl6ZUtleVRva2VuKGUsIGlzRmlyc3QpIHtcbiAgY29uc3QgayA9IGUua2V5O1xuXG4gIC8vIElnbm9yZSBzdGFuZGFsb25lIG1vZGlmaWVyIGtleXNcbiAgaWYgKGsgPT09IFwiU2hpZnRcIiB8fCBrID09PSBcIkNvbnRyb2xcIiB8fCBrID09PSBcIkFsdFwiIHx8IGsgPT09IFwiTWV0YVwiKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBCYXNlIGtleSAobG93ZXJjYXNlZCBmb3IgbGV0dGVycyB0byBrZWVwIHRva2VucyBjb25zaXN0ZW50KVxuICBsZXQgYmFzZSA9IGsubGVuZ3RoID09PSAxID8gay50b0xvd2VyQ2FzZSgpIDogaztcblxuICAvLyBGYXN0IHBhdGg6IG5vbi1maXJzdCB0b2tlbnMgaWdub3JlIG1vZGlmaWVycyAoa2VlcHMgc2VxdWVuY2VzIHNtb290aClcbiAgaWYgKCFpc0ZpcnN0KSByZXR1cm4gYmFzZTtcblxuICAvLyBPbmx5IGVuY29kZSBtb2RpZmllcnMgb24gdGhlIEZJUlNUIHRva2VuIG9mIGEgc2VxdWVuY2VcbiAgY29uc3QgbW9kcyA9IFtdO1xuICBpZiAoZS5jdHJsS2V5KSBtb2RzLnB1c2goXCJDXCIpO1xuICBpZiAoZS5zaGlmdEtleSkgbW9kcy5wdXNoKFwiU1wiKTtcbiAgcmV0dXJuIG1vZHMubGVuZ3RoID8gbW9kcy5qb2luKFwiLVwiKSArIFwiLVwiICsgYmFzZSA6IGJhc2U7XG59XG5cbi8vIEhlbHBlcjogcmluZyBidWZmZXIgb3BlcmF0aW9uc1xuZnVuY3Rpb24gcmJDbGVhcigpIHtcbiAgcmJTdGFydCA9IDA7IHJiU2l6ZSA9IDA7XG59XG5mdW5jdGlvbiByYlB1c2godG9rZW4pIHtcbiAgaWYgKHJiU2l6ZSA8IFJCX0NBUCkge1xuICAgIHJiWyhyYlN0YXJ0ICsgcmJTaXplKSAlIFJCX0NBUF0gPSB0b2tlbjtcbiAgICByYlNpemUrKztcbiAgfSBlbHNlIHtcbiAgICAvLyBvdmVyd3JpdGUgb2xkZXN0XG4gICAgcmJbcmJTdGFydF0gPSB0b2tlbjtcbiAgICByYlN0YXJ0ID0gKHJiU3RhcnQgKyAxKSAlIFJCX0NBUDtcbiAgfVxufVxuZnVuY3Rpb24gcmJTZXRMYXRlc3QodG9rZW4pIHtcbiAgcmJTdGFydCA9IDA7IHJiU2l6ZSA9IDE7IHJiWzBdID0gdG9rZW47XG59XG5cbi8vIEF0dGVtcHQgdG8gbWF0Y2ggdG9rZW5zIGN1cnJlbnRseSBpbiByaW5nIGJ1ZmZlclxuZnVuY3Rpb24gYXR0ZW1wdE1hdGNoRnJvbVJpbmcoKSB7XG4gIGxldCBub2RlID0gQ09NTUFORF9UUklFO1xuICBsZXQgbGFzdEV4YWN0ID0gbnVsbDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCByYlNpemU7IGkrKykge1xuICAgIGNvbnN0IHQgPSByYlsocmJTdGFydCArIGkpICUgUkJfQ0FQXTtcbiAgICBjb25zdCBuZXh0ID0gbm9kZS5jaGlsZHJlbi5nZXQodCk7XG4gICAgaWYgKCFuZXh0KSB7XG4gICAgICByZXR1cm4geyB0eXBlOiBcIm5vbmVcIiwgbGFzdEV4YWN0IH07XG4gICAgfVxuICAgIG5vZGUgPSBuZXh0O1xuICAgIGlmIChub2RlLmhhbmRsZXIpIGxhc3RFeGFjdCA9IHsgaGFuZGxlcjogbm9kZS5oYW5kbGVyLCBkZXB0aDogaSArIDEgfTtcbiAgfVxuICBpZiAobm9kZS5oYW5kbGVyKSByZXR1cm4geyB0eXBlOiBcImV4YWN0XCIsIGhhbmRsZXI6IG5vZGUuaGFuZGxlciwgaGFzQ2hpbGRyZW46IG5vZGUuY2hpbGRyZW4uc2l6ZSA+IDAgfTtcbiAgaWYgKG5vZGUuY2hpbGRyZW4uc2l6ZSA+IDApIHJldHVybiB7IHR5cGU6IFwicHJlZml4XCIsIGxhc3RFeGFjdCB9O1xuICByZXR1cm4geyB0eXBlOiBcIm5vbmVcIiwgbGFzdEV4YWN0IH07XG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUga2V5IHdhcyBoYW5kbGVkIChleGFjdCBvciBwcmVmaXggbWF0Y2gpLCBmYWxzZSBvdGhlcndpc2VcbmNvbnN0IG5vcm1hbE1vZGVIYW5kbGVyID0gKGUpID0+IHtcbiAgLy8gUHJlLWNvbXB1dGUgXCJpcyBmaXJzdCB0b2tlblwiIHNvIG5vcm1hbGl6ZXIgY2FuIHRha2UgdGhlIGZhc3QgcGF0aFxuICBjb25zdCB0b2tlbiA9IG5vcm1hbGl6ZUtleVRva2VuKGUsIHJiU2l6ZSA9PT0gMCk7XG4gIGlmICghdG9rZW4pIHJldHVybiBmYWxzZTsgLy8gaWdub3JlZCAocHVyZSBtb2RpZmllcilcblxuICAvLyBBcHBlbmQgdG9rZW4gKHJpbmcgYnVmZmVyKVxuICByYlB1c2godG9rZW4pO1xuXG4gIC8vIFRyeSB0byBtYXRjaCB0aGUgY3VycmVudCBidWZmZXJcbiAgbGV0IHJlc3VsdCA9IGF0dGVtcHRNYXRjaEZyb21SaW5nKCk7XG5cbiAgaWYgKHJlc3VsdC50eXBlID09PSBcImV4YWN0XCIpIHtcbiAgICBpZiAodGltZW91dElkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgIHRpbWVvdXRJZCA9IG51bGw7XG4gICAgfVxuICAgIC8vIElmIHRoaXMgZXhhY3QgYWxzbyBoYXMgY2hpbGRyZW4sIGRlbGF5IGV4ZWN1dGlvbiB0byBhbGxvdyBhIGxvbmdlciBtYXBwaW5nXG4gICAgaWYgKHJlc3VsdC5oYXNDaGlsZHJlbikge1xuICAgICAgLy8gU2V0IHBlbmRpbmcgZXhhY3Q7IHdhaXQgZm9yIG5leHQgdG9rZW4gd2l0aGluIFRJTUVPVVRcbiAgICAgIHBlbmRpbmdFeGFjdCA9IHJlc3VsdC5oYW5kbGVyO1xuICAgICAgaWYgKHBlbmRpbmdUaW1lcklkKSBjbGVhclRpbWVvdXQocGVuZGluZ1RpbWVySWQpO1xuICAgICAgcGVuZGluZ1RpbWVySWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdHJ5IHsgcGVuZGluZ0V4YWN0ICYmIHBlbmRpbmdFeGFjdCgpOyB9IGNhdGNoIChfKSB7fVxuICAgICAgICBwZW5kaW5nRXhhY3QgPSBudWxsO1xuICAgICAgICBwZW5kaW5nVGltZXJJZCA9IG51bGw7XG4gICAgICAgIHJiQ2xlYXIoKTtcbiAgICAgIH0sIFRJTUVPVVQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vIE5vIGNoaWxkcmVuOiBleGVjdXRlIGltbWVkaWF0ZWx5XG4gICAgaWYgKHBlbmRpbmdUaW1lcklkKSB7IGNsZWFyVGltZW91dChwZW5kaW5nVGltZXJJZCk7IHBlbmRpbmdUaW1lcklkID0gbnVsbDsgfVxuICAgIHBlbmRpbmdFeGFjdCA9IG51bGw7XG4gICAgcmVzdWx0LmhhbmRsZXIoZSk7XG4gICAgcmJDbGVhcigpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKHJlc3VsdC50eXBlID09PSBcInByZWZpeFwiKSB7XG4gICAgLy8gV2FpdCBmb3IgdGhlIHJlc3Qgb2YgdGhlIHNlcXVlbmNlOyBpZiBhIHNob3J0ZXIgZXhhY3QgZXhpc3RzLCBleGVjdXRlIGl0IG9uIHRpbWVvdXRcbiAgICBpZiAodGltZW91dElkKSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICBjb25zdCBsYXN0RXhhY3QgPSByZXN1bHQubGFzdEV4YWN0OyAvLyBtYXkgYmUgbnVsbFxuICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgaWYgKGxhc3RFeGFjdD8uaGFuZGxlcikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGxhc3RFeGFjdC5oYW5kbGVyKCk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHt9XG4gICAgICB9XG4gICAgICByYkNsZWFyKCk7XG4gICAgICB0aW1lb3V0SWQgPSBudWxsO1xuICAgIH0sIFRJTUVPVVQpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gTm8gbWF0Y2ggd2l0aCBjdXJyZW50IGJ1ZmZlcjsgdHJ5IHdpdGggb25seSB0aGUgbGF0ZXN0IHRva2VuXG4gIC8vIElmIHdlIGhhZCBhIHBlbmRpbmcgZXhhY3Qgd2FpdGluZyBmb3IgY29udGludWF0aW9uLCBmbHVzaCBpdCBpbW1lZGlhdGVseSBvbiBkaXZlcmdlbmNlXG4gIGlmIChwZW5kaW5nRXhhY3QpIHtcbiAgICBpZiAocGVuZGluZ1RpbWVySWQpIHsgY2xlYXJUaW1lb3V0KHBlbmRpbmdUaW1lcklkKTsgcGVuZGluZ1RpbWVySWQgPSBudWxsOyB9XG4gICAgdHJ5IHsgcGVuZGluZ0V4YWN0KCk7IH0gY2F0Y2ggKF8pIHt9XG4gICAgcGVuZGluZ0V4YWN0ID0gbnVsbDtcbiAgfVxuXG4gIHJiU2V0TGF0ZXN0KHRva2VuKTtcbiAgcmVzdWx0ID0gYXR0ZW1wdE1hdGNoRnJvbVJpbmcoKTtcbiAgaWYgKHJlc3VsdC50eXBlID09PSBcImV4YWN0XCIpIHtcbiAgICBpZiAodGltZW91dElkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgIHRpbWVvdXRJZCA9IG51bGw7XG4gICAgfVxuICAgIC8vIElmIHRoaXMgZXhhY3QgYWxzbyBoYXMgY2hpbGRyZW4sIHNldCBwZW5kaW5nIGluc3RlYWQgb2YgaW1tZWRpYXRlIGV4ZWNcbiAgICBpZiAocmVzdWx0Lmhhc0NoaWxkcmVuKSB7XG4gICAgICBwZW5kaW5nRXhhY3QgPSByZXN1bHQuaGFuZGxlcjtcbiAgICAgIGlmIChwZW5kaW5nVGltZXJJZCkgY2xlYXJUaW1lb3V0KHBlbmRpbmdUaW1lcklkKTtcbiAgICAgIHBlbmRpbmdUaW1lcklkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRyeSB7IHBlbmRpbmdFeGFjdCAmJiBwZW5kaW5nRXhhY3QoKTsgfSBjYXRjaCAoXykge31cbiAgICAgICAgcGVuZGluZ0V4YWN0ID0gbnVsbDtcbiAgICAgICAgcGVuZGluZ1RpbWVySWQgPSBudWxsO1xuICAgICAgICByYkNsZWFyKCk7XG4gICAgICB9LCBUSU1FT1VUKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAocGVuZGluZ1RpbWVySWQpIHsgY2xlYXJUaW1lb3V0KHBlbmRpbmdUaW1lcklkKTsgcGVuZGluZ1RpbWVySWQgPSBudWxsOyB9XG4gICAgcGVuZGluZ0V4YWN0ID0gbnVsbDtcbiAgICByZXN1bHQuaGFuZGxlcihlKTtcbiAgICByYkNsZWFyKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKHJlc3VsdC50eXBlID09PSBcInByZWZpeFwiKSB7XG4gICAgaWYgKHRpbWVvdXRJZCkgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICByYkNsZWFyKCk7XG4gICAgICB0aW1lb3V0SWQgPSBudWxsO1xuICAgIH0sIFRJTUVPVVQpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gU3RpbGwgbm8gbWF0Y2hcbiAgaWYgKHRpbWVvdXRJZCkge1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgIHRpbWVvdXRJZCA9IG51bGw7XG4gIH1cbiAgcmJDbGVhcigpO1xuICByZXR1cm4gZmFsc2U7XG59O1xuXG5jb25zdCBpbnNlcnRNb2RlSGFuZGxlciA9IChlKSA9PiB7XG4gIGlmIChlLmtleSA9PT0gXCJFc2NhcGVcIikge1xuICAgIGN1cnJlbnRWaW1Nb2RlID0gVklNX01PREVTLk5PUk1BTDtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVLZXlkb3duID0gKGUpID0+IHtcbiAgc3dpdGNoIChjdXJyZW50VmltTW9kZSkge1xuICAgIGNhc2UgVklNX01PREVTLk5PUk1BTDoge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgLy8gZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgIC8vIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICBub3JtYWxNb2RlSGFuZGxlcihlKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjYXNlIFZJTV9NT0RFUy5JTlNFUlQ6XG4gICAgICBpbnNlcnRNb2RlSGFuZGxlcihlKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLndhcm4oXCJVbmV4cGVjdGVkIG1vZGU6XCIsIGN1cnJlbnRWaW1Nb2RlKTtcbiAgICAgIGJyZWFrO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgaGFuZGxlQ2xpY2sgPSAoZSkgPT4ge1xuICBzd2l0Y2ggKGN1cnJlbnRWaW1Nb2RlKSB7XG4gICAgY2FzZSBWSU1fTU9ERVMuTk9STUFMOiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldDtcbiAgICAgIGlmIChpc0lucHV0RmllbGQodGFyZ2V0KSkge1xuICAgICAgICBjdXJyZW50VmltTW9kZSA9IFZJTV9NT0RFUy5JTlNFUlQ7XG4gICAgICB9XG4gICAgfVxuICAgIGNhc2UgVklNX01PREVTLklOU0VSVDpcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLndhcm4oXCJVbmV4cGVjdGVkIG1vZGU6XCIsIGN1cnJlbnRWaW1Nb2RlKTtcbiAgICAgIGJyZWFrO1xuICB9XG59O1xuIiwgIi8vIFRpbnksIGlkZW1wb3RlbnQgYm9vdHN0cmFwIHRoYXQgbGF6eS1sb2FkcyBET00gbG9naWMgb24gZmlyc3QgdXNlLlxuaW1wb3J0IHsgaGFuZGxlS2V5ZG93biwgaGFuZGxlQ2xpY2ssIGN1cnJlbnRWaW1Nb2RlIH0gZnJvbSBcIi4vdmltX21vZGUuanNcIjtcblxuY29uc3QgQk9PVFNUUkFQX0ZMQUcgPSBcIl9fd2VyX2Jvb3RzdHJhcF9pbnN0YWxsZWRcIjtcblxuLy8gUHJldmVudCBkdXBsaWNhdGUgaW5zdGFsbHMgKFNQQXMsIGJmY2FjaGUsIHJlLWluamVjdGlvbilcbmlmICghZ2xvYmFsVGhpc1tCT09UU1RSQVBfRkxBR10pIHtcbiAgZ2xvYmFsVGhpc1tCT09UU1RSQVBfRkxBR10gPSB0cnVlO1xuICBjb25zb2xlLmxvZyhcIkRlZmF1bHQgbW9kZTogXCIgKyBjdXJyZW50VmltTW9kZSk7XG5cbiAgLy8gVmltIGtleWRvd24gaGFuZGxlciBpcyBpbXBvcnRlZCBmcm9tIHZpbV9tb2RlLmpzXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGhhbmRsZUtleWRvd24sIHsgY2FwdHVyZTogdHJ1ZSB9KTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhhbmRsZUNsaWNrLCB7IGNhcHR1cmU6IHRydWUgfSk7XG5cbiAgLy8gTGF6eS1sb2FkIHZpbV9kaXNwbGF5IGFmdGVyIGZpcnN0IGludGVyYWN0aW9uLCB0aGVuIGtlZXAgaXQgaW4gc3luY1xuICBsZXQgX192aW1EaXNwbGF5TG9hZGVkID0gZmFsc2U7XG4gIGxldCBfX3ZpbURpc3BsYXlNb2RQcm9taXNlID0gbnVsbDtcbiAgY29uc3QgbG9hZFZpbURpc3BsYXkgPSBhc3luYyAoKSA9PiB7XG4gICAgaWYgKF9fdmltRGlzcGxheUxvYWRlZCkgcmV0dXJuIF9fdmltRGlzcGxheU1vZFByb21pc2U7XG4gICAgaWYgKCFfX3ZpbURpc3BsYXlNb2RQcm9taXNlKSB7XG4gICAgICBjb25zdCB1cmwgPSAoZ2xvYmFsVGhpcy5jaHJvbWUgJiYgY2hyb21lLnJ1bnRpbWUgJiYgY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKVxuICAgICAgICA/IGNocm9tZS5ydW50aW1lLmdldFVSTChcImpzL2Rpc3QvdmltX2Rpc3BsYXkuanNcIilcbiAgICAgICAgOiBcIi9qcy9kaXN0L3ZpbV9kaXNwbGF5LmpzXCI7IC8vIGZhbGxiYWNrIHBhdGggZm9yIGRldiBzdGF0aWMgc2VydmluZ1xuICAgICAgX192aW1EaXNwbGF5TW9kUHJvbWlzZSA9IGltcG9ydCh1cmwpLnRoZW4oKG1vZCkgPT4ge1xuICAgICAgICB0cnkgeyBtb2QuaW5pdFZpbURpc3BsYXk/LigpOyB9IGNhdGNoIChfKSB7fVxuICAgICAgICBfX3ZpbURpc3BsYXlMb2FkZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gbW9kO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBfX3ZpbURpc3BsYXlNb2RQcm9taXNlO1xuICB9O1xuXG4gIC8vIFVwZGF0ZSBBRlRFUiB2aW0gaGFuZGxlcnMgcnVuIChidWJibGUgcGhhc2UpLiBUcmlnZ2VycyBsYXp5IGxvYWQgb24gZmlyc3QgZXZlbnQuXG4gIGNvbnN0IHN5bmNPbktleWRvd24gPSAoKSA9PiB7IGxvYWRWaW1EaXNwbGF5KCkudGhlbigobSkgPT4gbS5zeW5jVmltRGlzcGxheT8uKGN1cnJlbnRWaW1Nb2RlKSk7IH07XG4gIGNvbnN0IHN5bmNPbkNsaWNrID0gKCkgPT4geyBsb2FkVmltRGlzcGxheSgpLnRoZW4oKG0pID0+IG0uc3luY1ZpbURpc3BsYXk/LihjdXJyZW50VmltTW9kZSkpOyB9O1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBzeW5jT25LZXlkb3duLCB7IGNhcHR1cmU6IGZhbHNlIH0pO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc3luY09uQ2xpY2ssIHsgY2FwdHVyZTogZmFsc2UgfSk7XG5cbiAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKGFzeW5jIChtc2cpID0+IHtcbiAgICBpZiAobXNnPy5hY3Rpb24gPT09IFwiY2xlYW51cFwiKSB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBoYW5kbGVLZXlkb3duLCB7IGNhcHR1cmU6IHRydWUgfSk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgaGFuZGxlQ2xpY2ssIHsgY2FwdHVyZTogdHJ1ZSB9KTtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHN5bmNPbktleWRvd24sIHsgY2FwdHVyZTogZmFsc2UgfSk7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc3luY09uQ2xpY2ssIHsgY2FwdHVyZTogZmFsc2UgfSk7XG4gICAgICAvLyBDbGVhbiB1cCB0aGUgVUkgaWYgaXQgd2FzIGxvYWRlZFxuICAgICAgaWYgKF9fdmltRGlzcGxheUxvYWRlZCkge1xuICAgICAgICBfX3ZpbURpc3BsYXlNb2RQcm9taXNlPy50aGVuKChtKSA9PiBtLmNsZWFudXBWaW1EaXNwbGF5Py4oKSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7O0FBQU8sTUFBSSxpQkFBaUI7QUFHNUIsTUFBTSxZQUFZO0FBQUEsSUFDaEIsUUFBUTtBQUFBLElBQ1IsUUFBUTtBQUFBLElBQ1IsUUFBUTtBQUFBLEVBQ1Y7QUFFQSxNQUFNLGNBQWM7QUFDcEIsTUFBTSxtQkFBbUI7QUFFekIsTUFBTSxlQUFlO0FBQUEsSUFDbkIsV0FBVztBQUFBLE1BQ1Q7QUFBQSxRQUNFLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLGFBQWE7QUFBQSxRQUNiLFNBQVMsTUFBTTtBQUNiLDJCQUFpQixVQUFVO0FBQzNCLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxNQUNBO0FBQUEsUUFDRSxLQUFLO0FBQUEsUUFDTCxNQUFNO0FBQUEsUUFDTixhQUFhO0FBQUEsUUFDYixTQUFTLENBQUMsUUFBUTtBQUNoQixnQkFBTSxXQUFXLENBQUMsQ0FBQyxLQUFLO0FBQ3hCLGdCQUFNLE9BQU8sV0FDVCxLQUFLLElBQUksR0FBRyxjQUFjLGdCQUFnQixJQUMxQztBQUNKLGdCQUFNLFdBQVcsV0FBVyxTQUFTO0FBQ3JDLGlCQUFPLFNBQVMsRUFBRSxNQUFNLENBQUMsTUFBTSxTQUFTLENBQUM7QUFDekMsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLE1BQ0E7QUFBQSxRQUNFLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLGFBQWE7QUFBQSxRQUNiLFNBQVMsQ0FBQyxRQUFRO0FBQ2hCLGdCQUFNLFdBQVcsQ0FBQyxDQUFDLEtBQUs7QUFDeEIsZ0JBQU0sT0FBTyxXQUNULEtBQUssSUFBSSxHQUFHLGNBQWMsZ0JBQWdCLElBQzFDO0FBQ0osZ0JBQU0sV0FBVyxXQUFXLFNBQVM7QUFDckMsaUJBQU8sU0FBUyxFQUFFLEtBQUssTUFBTSxTQUFTLENBQUM7QUFDdkMsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLE1BQ0E7QUFBQSxRQUNFLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLGFBQWE7QUFBQSxRQUNiLFNBQVMsQ0FBQyxRQUFRO0FBQ2hCLGdCQUFNLFdBQVcsQ0FBQyxDQUFDLEtBQUs7QUFDeEIsZ0JBQU0sT0FBTyxXQUNULEtBQUssSUFBSSxHQUFHLGNBQWMsZ0JBQWdCLElBQzFDO0FBQ0osZ0JBQU0sV0FBVyxXQUFXLFNBQVM7QUFDckMsaUJBQU8sU0FBUyxFQUFFLEtBQUssQ0FBQyxNQUFNLFNBQVMsQ0FBQztBQUN4QyxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsTUFDQTtBQUFBLFFBQ0UsS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sYUFBYTtBQUFBLFFBQ2IsU0FBUyxDQUFDLFFBQVE7QUFDaEIsZ0JBQU0sV0FBVyxDQUFDLENBQUMsS0FBSztBQUN4QixnQkFBTSxPQUFPLFdBQ1QsS0FBSyxJQUFJLEdBQUcsY0FBYyxnQkFBZ0IsSUFDMUM7QUFDSixnQkFBTSxXQUFXLFdBQVcsU0FBUztBQUNyQyxpQkFBTyxTQUFTLEVBQUUsTUFBTSxNQUFNLFNBQVMsQ0FBQztBQUN4QyxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsTUFDQTtBQUFBLFFBQ0UsS0FBSztBQUFBLFFBQ0wsTUFBTTtBQUFBLFFBQ04sYUFBYTtBQUFBLFFBQ2IsU0FBUyxNQUFNO0FBQ2Isa0JBQVEsSUFBSSxrQkFBa0I7QUFDOUIsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLE1BQ0E7QUFBQSxRQUNFLEtBQUssQ0FBQyxPQUFPLEdBQUc7QUFBQSxRQUNoQixNQUFNO0FBQUEsUUFDTixhQUFhO0FBQUEsUUFDYixTQUFTLE1BQU07QUFDYixrQkFBUSxJQUFJLDBCQUEwQjtBQUN0QyxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsTUFDQTtBQUFBLFFBQ0UsS0FBSyxDQUFDLE9BQU8sR0FBRztBQUFBLFFBQ2hCLE1BQU07QUFBQSxRQUNOLGFBQWE7QUFBQSxRQUNiLFNBQVMsTUFBTTtBQUNiLGtCQUFRLElBQUksMEJBQTBCO0FBQ3RDLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxNQUNBO0FBQUEsUUFDRSxLQUFLO0FBQUEsUUFDTCxNQUFNO0FBQUEsUUFDTixhQUFhO0FBQUEsUUFDYixTQUFTLENBQUMsUUFBUTtBQUNoQixnQkFBTSxXQUFXLENBQUMsQ0FBQyxLQUFLO0FBQ3hCLGdCQUFNLE9BQU8sS0FBSyxJQUFJLEdBQUcsS0FBSyxNQUFNLE9BQU8sY0FBYyxHQUFHLENBQUM7QUFDN0QsZ0JBQU0sT0FBTyxXQUFXLEtBQUssSUFBSSxHQUFHLE9BQU8sZ0JBQWdCLElBQUk7QUFDL0QsZ0JBQU0sV0FBVyxXQUFXLFNBQVM7QUFDckMsaUJBQU8sU0FBUyxFQUFFLEtBQUssTUFBTSxTQUFTLENBQUM7QUFDdkMsaUJBQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLE1BQ0E7QUFBQSxRQUNFLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLGFBQWE7QUFBQSxRQUNiLFNBQVMsQ0FBQyxRQUFRO0FBQ2hCLGdCQUFNLFdBQVcsQ0FBQyxDQUFDLEtBQUs7QUFDeEIsZ0JBQU0sT0FBTyxLQUFLLElBQUksR0FBRyxLQUFLLE1BQU0sT0FBTyxjQUFjLEdBQUcsQ0FBQztBQUM3RCxnQkFBTSxPQUFPLFdBQVcsS0FBSyxJQUFJLEdBQUcsT0FBTyxnQkFBZ0IsSUFBSTtBQUMvRCxnQkFBTSxXQUFXLFdBQVcsU0FBUztBQUNyQyxpQkFBTyxTQUFTLEVBQUUsS0FBSyxDQUFDLE1BQU0sU0FBUyxDQUFDO0FBQ3hDLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxNQUNBO0FBQUEsUUFDRSxLQUFLO0FBQUEsUUFDTCxNQUFNO0FBQUEsUUFDTixhQUFhO0FBQUEsUUFDYixTQUFTLENBQUMsUUFBUTtBQUNoQixnQkFBTSxXQUFXLEtBQUssU0FBUyxTQUFTO0FBQ3hDLGlCQUFPLFNBQVMsRUFBRSxLQUFLLEdBQUcsU0FBUyxDQUFDO0FBQ3BDLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxNQUNBO0FBQUEsUUFDRSxLQUFLO0FBQUEsUUFDTCxNQUFNO0FBQUEsUUFDTixhQUFhO0FBQUEsUUFDYixTQUFTLENBQUMsUUFBUTtBQUNoQixnQkFBTSxXQUFXLEtBQUssU0FBUyxTQUFTO0FBQ3hDLGdCQUFNLE1BQ0osU0FBUyxvQkFDVCxTQUFTLG1CQUNULFNBQVM7QUFDWCxpQkFBTyxTQUFTLEVBQUUsS0FBSyxJQUFJLGNBQWMsU0FBUyxDQUFDO0FBQ25ELGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUlBLE1BQUksU0FBUztBQUNiLE1BQUksS0FBSyxJQUFJLE1BQU0sQ0FBQztBQUNwQixNQUFJLFVBQVU7QUFDZCxNQUFJLFNBQVM7QUFDYixNQUFJLFlBQVk7QUFDaEIsTUFBTSxVQUFVO0FBRWhCLE1BQUksZUFBZTtBQUNuQixNQUFJLGlCQUFpQjtBQUdyQixXQUFTLG1CQUFtQixLQUFLO0FBRS9CLFFBQUksTUFBTSxRQUFRLEdBQUcsRUFBRyxRQUFPLElBQUksTUFBTTtBQUN6QyxVQUFNLFNBQVMsT0FBTyxHQUFHO0FBRXpCLFFBQUksT0FBTyxTQUFTLEdBQUcsRUFBRyxRQUFPLE9BQU8sS0FBSyxFQUFFLE1BQU0sS0FBSztBQUkxRCxRQUFJLE9BQU8sU0FBUyxHQUFHLEdBQUc7QUFDeEIsWUFBTSxPQUFPLE9BQU8sTUFBTSxHQUFHO0FBQzdCLFVBQUksSUFBSTtBQUNSLFlBQU0sT0FBTyxDQUFDO0FBQ2QsYUFBTyxJQUFJLEtBQUssV0FBVyxLQUFLLENBQUMsTUFBTSxPQUFPLEtBQUssQ0FBQyxNQUFNLE1BQU07QUFDOUQsYUFBSyxLQUFLLEtBQUssQ0FBQyxDQUFDO0FBQ2pCO0FBQUEsTUFDRjtBQUNBLFVBQUksSUFBSSxLQUFLLFFBQVE7QUFDbkIsY0FBTSxPQUFPLEtBQUssR0FBRztBQUNyQixjQUFNLFNBQVMsS0FBSyxTQUFTLEtBQUssS0FBSyxHQUFHLElBQUksTUFBTSxNQUFNO0FBQzFELGNBQU0sT0FBTyxLQUFLLE1BQU0sQ0FBQztBQUN6QixlQUFPLENBQUMsT0FBTyxHQUFHLElBQUk7QUFBQSxNQUN4QjtBQUNBLGFBQU8sQ0FBQyxNQUFNO0FBQUEsSUFDaEI7QUFHQSxXQUFPLE9BQU8sTUFBTSxFQUFFO0FBQUEsRUFDeEI7QUFFQSxXQUFTLGlCQUFpQixVQUFVO0FBQ2xDLFVBQU0sT0FBTyxFQUFFLFVBQVUsb0JBQUksSUFBSSxHQUFHLFNBQVMsS0FBSztBQUNsRCxRQUFJLFNBQVM7QUFDYixlQUFXLE9BQU8sVUFBVTtBQUMxQixZQUFNLFNBQVMsbUJBQW1CLElBQUksR0FBRztBQUN6QyxlQUFTLEtBQUssSUFBSSxRQUFRLE9BQU8sTUFBTTtBQUN2QyxVQUFJLE9BQU87QUFDWCxpQkFBVyxLQUFLLFFBQVE7QUFDdEIsWUFBSSxDQUFDLEtBQUssU0FBUyxJQUFJLENBQUM7QUFDdEIsZUFBSyxTQUFTLElBQUksR0FBRyxFQUFFLFVBQVUsb0JBQUksSUFBSSxHQUFHLFNBQVMsS0FBSyxDQUFDO0FBQzdELGVBQU8sS0FBSyxTQUFTLElBQUksQ0FBQztBQUFBLE1BQzVCO0FBRUEsV0FBSyxVQUFVLElBQUk7QUFBQSxJQUNyQjtBQUNBLFdBQU8sRUFBRSxNQUFNLE9BQU87QUFBQSxFQUN4QjtBQUVBLE1BQU0sRUFBRSxNQUFNLGNBQWMsUUFBUSxZQUFZLElBQUk7QUFBQSxJQUNsRCxhQUFhO0FBQUEsRUFDZjtBQUVBLFdBQVMsS0FBSyxJQUFJLEdBQUcsV0FBVztBQUNoQyxPQUFLLElBQUksTUFBTSxNQUFNO0FBSWQsV0FBUyxhQUFhLFNBQVM7QUFDcEMsV0FDRSxZQUNDLFFBQVEsWUFBWSxXQUNuQixRQUFRLFlBQVksY0FDcEIsUUFBUTtBQUFBLEVBRWQ7QUFLQSxXQUFTLGtCQUFrQixHQUFHLFNBQVM7QUFDckMsVUFBTSxJQUFJLEVBQUU7QUFHWixRQUFJLE1BQU0sV0FBVyxNQUFNLGFBQWEsTUFBTSxTQUFTLE1BQU0sUUFBUTtBQUNuRSxhQUFPO0FBQUEsSUFDVDtBQUdBLFFBQUksT0FBTyxFQUFFLFdBQVcsSUFBSSxFQUFFLFlBQVksSUFBSTtBQUc5QyxRQUFJLENBQUMsUUFBUyxRQUFPO0FBR3JCLFVBQU0sT0FBTyxDQUFDO0FBQ2QsUUFBSSxFQUFFLFFBQVMsTUFBSyxLQUFLLEdBQUc7QUFDNUIsUUFBSSxFQUFFLFNBQVUsTUFBSyxLQUFLLEdBQUc7QUFDN0IsV0FBTyxLQUFLLFNBQVMsS0FBSyxLQUFLLEdBQUcsSUFBSSxNQUFNLE9BQU87QUFBQSxFQUNyRDtBQUdBLFdBQVMsVUFBVTtBQUNqQixjQUFVO0FBQUcsYUFBUztBQUFBLEVBQ3hCO0FBQ0EsV0FBUyxPQUFPLE9BQU87QUFDckIsUUFBSSxTQUFTLFFBQVE7QUFDbkIsVUFBSSxVQUFVLFVBQVUsTUFBTSxJQUFJO0FBQ2xDO0FBQUEsSUFDRixPQUFPO0FBRUwsU0FBRyxPQUFPLElBQUk7QUFDZCxpQkFBVyxVQUFVLEtBQUs7QUFBQSxJQUM1QjtBQUFBLEVBQ0Y7QUFDQSxXQUFTLFlBQVksT0FBTztBQUMxQixjQUFVO0FBQUcsYUFBUztBQUFHLE9BQUcsQ0FBQyxJQUFJO0FBQUEsRUFDbkM7QUFHQSxXQUFTLHVCQUF1QjtBQUM5QixRQUFJLE9BQU87QUFDWCxRQUFJLFlBQVk7QUFDaEIsYUFBUyxJQUFJLEdBQUcsSUFBSSxRQUFRLEtBQUs7QUFDL0IsWUFBTSxJQUFJLElBQUksVUFBVSxLQUFLLE1BQU07QUFDbkMsWUFBTSxPQUFPLEtBQUssU0FBUyxJQUFJLENBQUM7QUFDaEMsVUFBSSxDQUFDLE1BQU07QUFDVCxlQUFPLEVBQUUsTUFBTSxRQUFRLFVBQVU7QUFBQSxNQUNuQztBQUNBLGFBQU87QUFDUCxVQUFJLEtBQUssUUFBUyxhQUFZLEVBQUUsU0FBUyxLQUFLLFNBQVMsT0FBTyxJQUFJLEVBQUU7QUFBQSxJQUN0RTtBQUNBLFFBQUksS0FBSyxRQUFTLFFBQU8sRUFBRSxNQUFNLFNBQVMsU0FBUyxLQUFLLFNBQVMsYUFBYSxLQUFLLFNBQVMsT0FBTyxFQUFFO0FBQ3JHLFFBQUksS0FBSyxTQUFTLE9BQU8sRUFBRyxRQUFPLEVBQUUsTUFBTSxVQUFVLFVBQVU7QUFDL0QsV0FBTyxFQUFFLE1BQU0sUUFBUSxVQUFVO0FBQUEsRUFDbkM7QUFHQSxNQUFNLG9CQUFvQixDQUFDLE1BQU07QUFFL0IsVUFBTSxRQUFRLGtCQUFrQixHQUFHLFdBQVcsQ0FBQztBQUMvQyxRQUFJLENBQUMsTUFBTyxRQUFPO0FBR25CLFdBQU8sS0FBSztBQUdaLFFBQUksU0FBUyxxQkFBcUI7QUFFbEMsUUFBSSxPQUFPLFNBQVMsU0FBUztBQUMzQixVQUFJLFdBQVc7QUFDYixxQkFBYSxTQUFTO0FBQ3RCLG9CQUFZO0FBQUEsTUFDZDtBQUVBLFVBQUksT0FBTyxhQUFhO0FBRXRCLHVCQUFlLE9BQU87QUFDdEIsWUFBSSxlQUFnQixjQUFhLGNBQWM7QUFDL0MseUJBQWlCLFdBQVcsTUFBTTtBQUNoQyxjQUFJO0FBQUUsNEJBQWdCLGFBQWE7QUFBQSxVQUFHLFNBQVMsR0FBRztBQUFBLFVBQUM7QUFDbkQseUJBQWU7QUFDZiwyQkFBaUI7QUFDakIsa0JBQVE7QUFBQSxRQUNWLEdBQUcsT0FBTztBQUNWLGVBQU87QUFBQSxNQUNUO0FBRUEsVUFBSSxnQkFBZ0I7QUFBRSxxQkFBYSxjQUFjO0FBQUcseUJBQWlCO0FBQUEsTUFBTTtBQUMzRSxxQkFBZTtBQUNmLGFBQU8sUUFBUSxDQUFDO0FBQ2hCLGNBQVE7QUFDUixhQUFPO0FBQUEsSUFDVDtBQUVBLFFBQUksT0FBTyxTQUFTLFVBQVU7QUFFNUIsVUFBSSxVQUFXLGNBQWEsU0FBUztBQUNyQyxZQUFNLFlBQVksT0FBTztBQUN6QixrQkFBWSxXQUFXLE1BQU07QUFDM0IsWUFBSSxXQUFXLFNBQVM7QUFDdEIsY0FBSTtBQUNGLHNCQUFVLFFBQVE7QUFBQSxVQUNwQixTQUFTLEdBQUc7QUFBQSxVQUFDO0FBQUEsUUFDZjtBQUNBLGdCQUFRO0FBQ1Isb0JBQVk7QUFBQSxNQUNkLEdBQUcsT0FBTztBQUNWLGFBQU87QUFBQSxJQUNUO0FBSUEsUUFBSSxjQUFjO0FBQ2hCLFVBQUksZ0JBQWdCO0FBQUUscUJBQWEsY0FBYztBQUFHLHlCQUFpQjtBQUFBLE1BQU07QUFDM0UsVUFBSTtBQUFFLHFCQUFhO0FBQUEsTUFBRyxTQUFTLEdBQUc7QUFBQSxNQUFDO0FBQ25DLHFCQUFlO0FBQUEsSUFDakI7QUFFQSxnQkFBWSxLQUFLO0FBQ2pCLGFBQVMscUJBQXFCO0FBQzlCLFFBQUksT0FBTyxTQUFTLFNBQVM7QUFDM0IsVUFBSSxXQUFXO0FBQ2IscUJBQWEsU0FBUztBQUN0QixvQkFBWTtBQUFBLE1BQ2Q7QUFFQSxVQUFJLE9BQU8sYUFBYTtBQUN0Qix1QkFBZSxPQUFPO0FBQ3RCLFlBQUksZUFBZ0IsY0FBYSxjQUFjO0FBQy9DLHlCQUFpQixXQUFXLE1BQU07QUFDaEMsY0FBSTtBQUFFLDRCQUFnQixhQUFhO0FBQUEsVUFBRyxTQUFTLEdBQUc7QUFBQSxVQUFDO0FBQ25ELHlCQUFlO0FBQ2YsMkJBQWlCO0FBQ2pCLGtCQUFRO0FBQUEsUUFDVixHQUFHLE9BQU87QUFDVixlQUFPO0FBQUEsTUFDVDtBQUNBLFVBQUksZ0JBQWdCO0FBQUUscUJBQWEsY0FBYztBQUFHLHlCQUFpQjtBQUFBLE1BQU07QUFDM0UscUJBQWU7QUFDZixhQUFPLFFBQVEsQ0FBQztBQUNoQixjQUFRO0FBQ1IsYUFBTztBQUFBLElBQ1Q7QUFDQSxRQUFJLE9BQU8sU0FBUyxVQUFVO0FBQzVCLFVBQUksVUFBVyxjQUFhLFNBQVM7QUFDckMsa0JBQVksV0FBVyxNQUFNO0FBQzNCLGdCQUFRO0FBQ1Isb0JBQVk7QUFBQSxNQUNkLEdBQUcsT0FBTztBQUNWLGFBQU87QUFBQSxJQUNUO0FBR0EsUUFBSSxXQUFXO0FBQ2IsbUJBQWEsU0FBUztBQUN0QixrQkFBWTtBQUFBLElBQ2Q7QUFDQSxZQUFRO0FBQ1IsV0FBTztBQUFBLEVBQ1Q7QUFFQSxNQUFNLG9CQUFvQixDQUFDLE1BQU07QUFDL0IsUUFBSSxFQUFFLFFBQVEsVUFBVTtBQUN0Qix1QkFBaUIsVUFBVTtBQUMzQixRQUFFLGVBQWU7QUFBQSxJQUNuQjtBQUFBLEVBQ0Y7QUFFTyxNQUFNLGdCQUFnQixDQUFDLE1BQU07QUFDbEMsWUFBUSxnQkFBZ0I7QUFBQSxNQUN0QixLQUFLLFVBQVUsUUFBUTtBQUNyQixVQUFFLGVBQWU7QUFHakIsMEJBQWtCLENBQUM7QUFDbkI7QUFBQSxNQUNGO0FBQUEsTUFDQSxLQUFLLFVBQVU7QUFDYiwwQkFBa0IsQ0FBQztBQUNuQjtBQUFBLE1BQ0Y7QUFDRSxnQkFBUSxLQUFLLG9CQUFvQixjQUFjO0FBQy9DO0FBQUEsSUFDSjtBQUFBLEVBQ0Y7QUFFTyxNQUFNLGNBQWMsQ0FBQyxNQUFNO0FBQ2hDLFlBQVEsZ0JBQWdCO0FBQUEsTUFDdEIsS0FBSyxVQUFVLFFBQVE7QUFDckIsY0FBTSxTQUFTLEVBQUU7QUFDakIsWUFBSSxhQUFhLE1BQU0sR0FBRztBQUN4QiwyQkFBaUIsVUFBVTtBQUFBLFFBQzdCO0FBQUEsTUFDRjtBQUFBLE1BQ0EsS0FBSyxVQUFVO0FBQ2I7QUFBQSxNQUNGO0FBQ0UsZ0JBQVEsS0FBSyxvQkFBb0IsY0FBYztBQUMvQztBQUFBLElBQ0o7QUFBQSxFQUNGOzs7QUN2YkEsTUFBTSxpQkFBaUI7QUFHdkIsTUFBSSxDQUFDLFdBQVcsY0FBYyxHQUFHO0FBQy9CLGVBQVcsY0FBYyxJQUFJO0FBQzdCLFlBQVEsSUFBSSxtQkFBbUIsY0FBYztBQUc3QyxhQUFTLGlCQUFpQixXQUFXLGVBQWUsRUFBRSxTQUFTLEtBQUssQ0FBQztBQUNyRSxhQUFTLGlCQUFpQixTQUFTLGFBQWEsRUFBRSxTQUFTLEtBQUssQ0FBQztBQUdqRSxRQUFJLHFCQUFxQjtBQUN6QixRQUFJLHlCQUF5QjtBQUM3QixVQUFNLGlCQUFpQixZQUFZO0FBQ2pDLFVBQUksbUJBQW9CLFFBQU87QUFDL0IsVUFBSSxDQUFDLHdCQUF3QjtBQUMzQixjQUFNLE1BQU8sV0FBVyxVQUFVLE9BQU8sV0FBVyxPQUFPLFFBQVEsU0FDL0QsT0FBTyxRQUFRLE9BQU8sd0JBQXdCLElBQzlDO0FBQ0osaUNBQXlCLE9BQU8sS0FBSyxLQUFLLENBQUMsUUFBUTtBQUNqRCxjQUFJO0FBQUUsZ0JBQUksaUJBQWlCO0FBQUEsVUFBRyxTQUFTLEdBQUc7QUFBQSxVQUFDO0FBQzNDLCtCQUFxQjtBQUNyQixpQkFBTztBQUFBLFFBQ1QsQ0FBQztBQUFBLE1BQ0g7QUFDQSxhQUFPO0FBQUEsSUFDVDtBQUdBLFVBQU0sZ0JBQWdCLE1BQU07QUFBRSxxQkFBZSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLGNBQWMsQ0FBQztBQUFBLElBQUc7QUFDaEcsVUFBTSxjQUFjLE1BQU07QUFBRSxxQkFBZSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLGNBQWMsQ0FBQztBQUFBLElBQUc7QUFDOUYsYUFBUyxpQkFBaUIsV0FBVyxlQUFlLEVBQUUsU0FBUyxNQUFNLENBQUM7QUFDdEUsYUFBUyxpQkFBaUIsU0FBUyxhQUFhLEVBQUUsU0FBUyxNQUFNLENBQUM7QUFFbEUsV0FBTyxRQUFRLFVBQVUsWUFBWSxPQUFPLFFBQVE7QUFDbEQsVUFBSSxLQUFLLFdBQVcsV0FBVztBQUM3QixpQkFBUyxvQkFBb0IsV0FBVyxlQUFlLEVBQUUsU0FBUyxLQUFLLENBQUM7QUFDeEUsaUJBQVMsb0JBQW9CLFNBQVMsYUFBYSxFQUFFLFNBQVMsS0FBSyxDQUFDO0FBQ3BFLGlCQUFTLG9CQUFvQixXQUFXLGVBQWUsRUFBRSxTQUFTLE1BQU0sQ0FBQztBQUN6RSxpQkFBUyxvQkFBb0IsU0FBUyxhQUFhLEVBQUUsU0FBUyxNQUFNLENBQUM7QUFFckUsWUFBSSxvQkFBb0I7QUFDdEIsa0NBQXdCLEtBQUssQ0FBQyxNQUFNLEVBQUUsb0JBQW9CLENBQUM7QUFBQSxRQUM3RDtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIOyIsCiAgIm5hbWVzIjogW10KfQo=
