import initWasmModule, { collect_tabs } from "./wasm/wasm_mod.js";

// Initialized wasm module
(async () => {
  await initWasmModule();
})();

let currentActiveTab = null;

// // Handle inject content script
// When tab becomes active, inject script into it and cleanup previous
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (currentActiveTab !== null) {
    // Tell previous tab to remove listener
    chrome.tabs
      .sendMessage(currentActiveTab, { action: "cleanup" })
      .catch(() => {});
  }

  currentActiveTab = tabId;

  // Inject listener into newly active tab
  chrome.scripting
    .executeScript({
      target: { tabId },
      files: ["js/content.js"],
    })
    .catch(() => {});
});

// When active tab reloads, re-inject listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    chrome.scripting
      .executeScript({
        target: { tabId },
        files: ["js/content.js"],
      })
      .catch((e) => {
        console.log("Error loading content.js: " + e);
      });
  }
});

// Handle event from content script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log("Background received message:", msg);

  if (msg.action === "commandTriggered") {
    switch (msg.command) {
      case "FuzzyFinder":
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

        break;
      default:
        console.log("Command not found");
    }

    return true; // keep the channel open
  }

  return false;
});
