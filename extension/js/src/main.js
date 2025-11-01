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

  chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg?.action === "cleanup") {
      document.removeEventListener("keydown", handleKeydown, { capture: true });
      document.removeEventListener("click", handleClick, { capture: true });
    }
  });
}
