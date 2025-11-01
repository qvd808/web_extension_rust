import initWasmModule, {
  collect_tabs,
  initialize_tabs,
  fuzzy_search,
} from "./wasm/wasm_mod.js";

// Initialize WASM module
(async () => {
  await initWasmModule();
})();

let currentActiveTab = null;

// Restricted URL patterns that cannot be injected
const RESTRICTED_PROTOCOLS = [
  "chrome://",
  "brave://",
  "edge://",
  "about:",
  "chrome-extension://",
  "moz-extension://",
];

/**
 * Check if a URL is restricted for content script injection
 */
function isRestrictedUrl(url) {
  if (!url) return true;
  return RESTRICTED_PROTOCOLS.some((protocol) => url.startsWith(protocol));
}

/**
 * Inject content script into a tab (only call after URL validation)
 */
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["js/content.js"],
    });
  } catch (err) {
    // Log unexpected errors (should not occur if URL was validated)
    console.error(`Unexpected error injecting content.js into tab ${tabId}:`, err);
  }
}

/**
 * Clean up previous tab's content script
 */
function cleanupPreviousTab(tabId) {
  chrome.tabs.sendMessage(tabId, { action: "cleanup" }).catch(() => {
    // Expected error when tab is closed or unreachable - ignore silently
  });
}

// Handle tab activation - inject content script into newly active tab
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  // Get tab info to check URL
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch (err) {
    console.warn(`Cannot get tab info for tab ${tabId}:`, err);
    return;
  }

  // Explicitly skip restricted pages - do not attempt injection
  if (isRestrictedUrl(tab.url)) {
    // This is expected behavior, not an error
    return;
  }

  // Cleanup previous tab
  if (currentActiveTab !== null) {
    cleanupPreviousTab(currentActiveTab);
  }

  currentActiveTab = tabId;

  // Inject content script into newly active tab
  await injectContentScript(tabId);
});

// Handle tab reload - re-inject content script
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.active) {
    return;
  }

  // Explicitly skip restricted pages - do not attempt injection
  if (isRestrictedUrl(tab.url)) {
    // This is expected behavior, not an error
    return;
  }

  await injectContentScript(tabId);
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  // Handle command triggers
  if (msg.action === "commandTriggered") {
    handleCommandTrigger(msg.command, sendResponse);
    return true; // Keep channel open for async response
  }

  // Handle fuzzy search queries
  if (msg.action === "fuzzySearch") {
    handleFuzzySearch(msg.query, sendResponse);
    return true; // Keep channel open for async response
  }

  return false;
});

/**
 * Handle command trigger from content script
 */
async function handleCommandTrigger(command, sendResponse) {
  if (command !== "FuzzyFinder") {
    console.log("Unknown command:", command);
    sendResponse({ success: false });
    return;
  }

  try {
    const tabs = await collect_tabs();
    initialize_tabs(tabs);
    sendResponse({ success: true });
  } catch (err) {
    console.error("Failed to get tabs:", err);
    sendResponse({ success: false });
  }
}

/**
 * Handle fuzzy search query
 */
function handleFuzzySearch(query, sendResponse) {
  try {
    const results = fuzzy_search(query);
    sendResponse(results);
  } catch (err) {
    console.error("Fuzzy search failed:", err);
    sendResponse([]);
  }
}
