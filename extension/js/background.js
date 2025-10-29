import initWasmModule, {
  collect_tabs,
  setup_keybind,
} from "./wasm/wasm_mod.js";

// Initialized wasm module
(async () => {
  await initWasmModule();
  setup_keybind();
})();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "getAllTabs") {
    // ##### Method 1: Using .then() #####
    // collect_tabs().then((tabs) => {
    //   sendResponse(tabs);
    // });

    // ##### Method 2: Using async/await #####
    (async () => {
      try {
        const tabs = await collect_tabs();
        sendResponse(tabs);
      } catch (err) {
        console.error("Failed to get tabs:", err);
        sendResponse([]);
      }
    })();

    return true; // keep the channel open
  }

  return false;
});
