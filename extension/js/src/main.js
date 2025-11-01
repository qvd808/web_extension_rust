// Tiny, idempotent bootstrap that lazy-loads DOM logic on first use.
import { handleKeydown, handleClick, currentVimMode } from "./vim_mode.js";

const BOOTSTRAP_FLAG = "__wer_bootstrap_installed";

// Prevent duplicate installs (SPAs, bfcache, re-injection)
if (!globalThis[BOOTSTRAP_FLAG]) {
  globalThis[BOOTSTRAP_FLAG] = true;
  console.log("Default mode: " + currentVimMode);

  // Vim keydown handler is imported from vim_mode.js
  document.addEventListener("keydown", handleKeydown, { capture: true });
  document.addEventListener("click", handleClick, { capture: true });

  // Lazy-load vim_display after first interaction, then keep it in sync
  let __vimDisplayLoaded = false;
  let __vimDisplayModPromise = null;
  const loadVimDisplay = async () => {
    if (__vimDisplayLoaded) return __vimDisplayModPromise;
    if (!__vimDisplayModPromise) {
      const url = (globalThis.chrome && chrome.runtime && chrome.runtime.getURL)
        ? chrome.runtime.getURL("js/dist/vim_display.js")
        : "/js/dist/vim_display.js"; // fallback path for dev static serving
      __vimDisplayModPromise = import(url).then((mod) => {
        try { mod.initVimDisplay?.(); } catch (_) {}
        __vimDisplayLoaded = true;
        return mod;
      });
    }
    return __vimDisplayModPromise;
  };

  // Update AFTER vim handlers run (bubble phase). Triggers lazy load on first event.
  const syncOnKeydown = () => { loadVimDisplay().then((m) => m.syncVimDisplay?.(currentVimMode)); };
  const syncOnClick = () => { loadVimDisplay().then((m) => m.syncVimDisplay?.(currentVimMode)); };
  document.addEventListener("keydown", syncOnKeydown, { capture: false });
  document.addEventListener("click", syncOnClick, { capture: false });

  chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg?.action === "cleanup") {
      document.removeEventListener("keydown", handleKeydown, { capture: true });
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("keydown", syncOnKeydown, { capture: false });
      document.removeEventListener("click", syncOnClick, { capture: false });
      // Clean up the UI if it was loaded
      if (__vimDisplayLoaded) {
        __vimDisplayModPromise?.then((m) => m.cleanupVimDisplay?.());
      }
    }
  });
}
