import initWasmModule, {
  collect_tabs,
  initialize_tabs,
  fuzzy_search,
} from "./wasm/wasm_mod.js";

import {
  KEYBIND_CONFIG,
  UI_CONFIG,
  RESTRICTED_URL,
} from "./configs/constant.js";

// Initialize WASM module
(async () => {
  await initWasmModule();
})();

let currentActiveTab = null;

function isRestrictedUrl(url) {
  if (!url) return true;
  return RESTRICTED_URL.some((protocol) => url.startsWith(protocol));
}

async function injectContentScript(tabId) {
  try {
    // First, inject the configs as a script that sets them on window
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "ISOLATED",
      func: (keybindConfig, uiConfig) => {
        window.KEYBIND_CONFIG = keybindConfig;
        window.UI_CONFIG = uiConfig;
      },
      args: [KEYBIND_CONFIG, UI_CONFIG],
    });

    // Then inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["js/content.js"],
      world: "ISOLATED",
    });
  } catch (err) {
    console.error(
      `Unexpected error injecting content.js into tab ${tabId}:`,
      err,
    );
  }
}

function cleanupPreviousTab(tabId) {
  chrome.tabs.sendMessage(tabId, { action: "cleanup" }).catch((e) => {
    // Expected error when tab is closed or unreachable - ignore silently
    console.log("Error encounting when clean up previous tab: " + e);
  });
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (err) {
    console.warn(`Cannot get tab info for tab ${tabId}:`, err);
    return;
  }

  if (isRestrictedUrl(tab.url)) {
    return;
  }

  if (currentActiveTab !== null) {
    cleanupPreviousTab(currentActiveTab);
  }

  currentActiveTab = tabId;

  await injectContentScript(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.active) {
    return;
  }

  if (isRestrictedUrl(tab.url)) {
    return;
  }

  await injectContentScript(tabId);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "commandTriggered") {
    handleCommandTrigger(msg.command, sendResponse);
    return true;
  }

  if (msg.action === "fuzzySearch") {
    handleFuzzySearch(msg.query, sendResponse);
    return true;
  }

  return false;
});

async function handleCommandTrigger(command, sendResponse) {
  switch (command) {
    case "FuzzyFinder":
      try {
        const tabs = await collect_tabs();
        initialize_tabs(tabs);
        sendResponse({ success: true });
      } catch (err) {
        console.error("Failed to get tabs:", err);
        sendResponse({ success: false });
      }
      break;

    case "GetLink":
      sendResponse({ success: true });
      break;

    default:
      console.log("Unknown command:", command);
      sendResponse({ success: false });
      break;
  }
}

function handleFuzzySearch(query, sendResponse) {
  try {
    const results = fuzzy_search(query);
    sendResponse(results);
  } catch (err) {
    console.error("Fuzzy search failed:", err);
    sendResponse([]);
  }
}
