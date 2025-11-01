// Minimal background: register one tiny content script once per document.
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
