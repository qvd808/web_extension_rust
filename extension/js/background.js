import initWasmModule, { collect_tabs } from "./wasm/wasm_mod.js";

// Initialized wasm module
(async () => {
  await initWasmModule();
})();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "getAllTabs") {
    // ##### Method 1: Using .then() #####
    // collect_tabs().then((tabs) => {
    //   sendResponse(tabs);
    // });

    // ##### Method 2: Using async/await #####
    (async () => {
      const tabs = await collect_tabs();
      sendResponse(tabs);
    })();

    return true; // keep the channel open
  }

  return false;
});
