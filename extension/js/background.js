// Background service worker (module):
// - Registers the tiny content script
// - Lazily loads WASM and serves fuzzy search queries from content scripts

import initWasm, { collect_tabs, initialize_tabs, fuzzy_search } from './wasm/wasm_mod.js';

// Minimal registration: one tiny content script once per document.
async function registerBootstrap() {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: ["bootstrap"] });
  } catch {
    // Ignore if not registered yet
  }

  await chrome.scripting.registerContentScripts([
    {
      id: "bootstrap",
      matches: ["http://*/*", "https://*/*"],
      js: ["js/dist/content.js"], // tiny bootstrap
      runAt: "document_idle",
      allFrames: false,
      persistAcrossSessions: true,
    },
  ]);
}

chrome.runtime.onInstalled.addListener(registerBootstrap);
chrome.runtime.onStartup.addListener(registerBootstrap);

// WASM lifecycle and message handling
let wasmReadyPromise = null;
let lastTabsInitAt = 0;

async function ensureWasmReady() {
  if (!wasmReadyPromise) {
    wasmReadyPromise = (async () => {
      await initWasm();
      const tabs = await collect_tabs();
      initialize_tabs(tabs);
      lastTabsInitAt = Date.now();
    })();
  }
  await wasmReadyPromise;

  // Opportunistic refresh every 5s to keep dataset roughly current
  if (Date.now() - lastTabsInitAt > 5000) {
    try {
      const tabs = await collect_tabs();
      initialize_tabs(tabs);
      lastTabsInitAt = Date.now();
    } catch (_) {
      // ignore refresh failures; will try again later
    }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'fuzzySearch') {
    (async () => {
      try {
        await ensureWasmReady();
        const q = String(msg.query || '');
        const results = fuzzy_search(q) || [];
        sendResponse({ ok: true, results });
      } catch (err) {
        sendResponse({ ok: false, error: String(err && err.message || err) });
      }
    })();
    return true; // keep message channel open for async sendResponse
  }

  if (msg.type === 'refreshTabs') {
    (async () => {
      try {
        await ensureWasmReady();
        // Force refresh regardless of interval
        const tabs = await collect_tabs();
        initialize_tabs(tabs);
        lastTabsInitAt = Date.now();
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err && err.message || err) });
      }
    })();
    return true;
  }

  if (msg.type === 'activateTab') {
    (async () => {
      try {
        const tabId = Number(msg.tabId);
        if (!Number.isFinite(tabId)) throw new Error('Invalid tabId');
        // Activate the tab
        await chrome.tabs.update(tabId, { active: true });
        // Focus the window containing that tab (best-effort)
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab && typeof tab.windowId === 'number') {
            await chrome.windows.update(tab.windowId, { focused: true });
          }
        } catch (_) { /* ignore */ }
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err && err.message || err) });
      }
    })();
    return true;
  }
});
