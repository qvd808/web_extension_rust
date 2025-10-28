// Import and initialize WASM module
import initWasmModule, { hello_world } from "./wasm/wasm_mod.js";

// Initialize WASM when extension loads
(async () => {
  try {
    await initWasmModule();
    hello_world();
    console.log("Background script: WASM module loaded!");
  } catch (error) {
    console.error("Failed to load WASM:", error);
  }
})();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received:", message);
  sendResponse({ success: true, from: "background" });
});
