// extension/js/search.js
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // If inside iframe, tell parent to close it
    if (window.top !== window.self) {
      window.parent.postMessage({ action: "closeIframe" }, "*");
    } else {
      // Fallback: remove overlay directly if not inside iframe
      const overlay = document.getElementById("extension-iframe-overlay");
      if (overlay) overlay.remove();
    }
  }
});

window.addEventListener("message", (event) => {
  if (event.data && event.data.action === "focusSearch") {
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.focus();
    }
  }
});
