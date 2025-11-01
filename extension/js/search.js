// extension/js/search.js

// ===== Constants =====
const TIME_CONSTANTS = {
  MINUTE: 60000,
  HOUR: 3600000,
  DAY: 86400000,
};

// ===== DOM Elements =====
const searchInput = document.getElementById("search-input");
const resultsContainer = document.getElementById("results-container");
const previewTitle = document.querySelector(".preview-title");
const previewContent = document.querySelector(".preview-content");

// ===== State =====
let selectedIndex = -1;
let currentResults = [];
let rafScheduled = false;

// ===== Search Functionality =====
searchInput.addEventListener("input", (e) => {
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame(() => {
      performSearch(e.target.value);
      rafScheduled = false;
    });
  }
});

async function performSearch(query) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "fuzzySearch",
      query,
    });
    currentResults = response || [];
    selectedIndex = currentResults.length > 0 ? 0 : -1;
    renderResults(currentResults);
  } catch (err) {
    console.error("Search failed:", err);
    currentResults = [];
    selectedIndex = -1;
    renderResults([]);
  }
}

// ===== Rendering =====
function renderResults(results) {
  if (!results?.length) {
    resultsContainer.innerHTML =
      '<div class="no-results">No matching tabs</div>';
    selectedIndex = -1;
    previewTitle.textContent = "Preview";
    previewContent.textContent = "No tab selected";
    return;
  }

  resultsContainer.innerHTML = results
    .map(
      (tab, index) => `
      <div class="result-item ${index === selectedIndex ? "selected" : ""}"
           data-tab-id="${tab.id || ""}"
           data-index="${index}">
        <div class="result-title">${escapeHtml(tab.title || "Untitled")}</div>
      </div>
    `,
    )
    .join("");

  attachResultListeners();

  // Show preview of first selected item
  if (selectedIndex >= 0 && currentResults[selectedIndex]) {
    showPreview(currentResults[selectedIndex]);
  }
}

function attachResultListeners() {
  document.querySelectorAll(".result-item").forEach((item) => {
    const index = parseInt(item.dataset.index);

    item.addEventListener("mouseenter", () => {
      showPreview(currentResults[index]);
    });

    item.addEventListener("click", () => {
      switchToTab(currentResults[index]?.id);
    });
  });
}

// ===== Preview =====
function showPreview(tab) {
  if (!tab) {
    previewTitle.textContent = "Preview";
    previewContent.textContent = "No tab selected";
    return;
  }

  previewTitle.textContent = tab.title || "Untitled";
  previewContent.innerHTML = `
    <div style="margin-bottom: 12px;">
      <strong>Tab ID:</strong> ${tab.id || "Unknown"}
    </div>
    <div style="margin-bottom: 12px;">
      <strong>Group:</strong> ${escapeHtml(tab.group_title || "No group")}
    </div>
    <div style="margin-bottom: 12px;">
      <strong>Last Accessed:</strong> ${formatLastAccessed(tab.last_accessed)}
    </div>
    <div>
      <strong>URL:</strong><br>
      <span style="word-break: break-all; color: #569cd6;">${escapeHtml(tab.url || "")}</span>
    </div>
  `;
}

function formatLastAccessed(timestamp) {
  if (!timestamp) return "Unknown";

  const date = new Date(timestamp);
  const diffMs = Date.now() - date;
  const diffMins = Math.floor(diffMs / TIME_CONSTANTS.MINUTE);
  const diffHours = Math.floor(diffMs / TIME_CONSTANTS.HOUR);
  const diffDays = Math.floor(diffMs / TIME_CONSTANTS.DAY);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleString();
}

// ===== Tab Switching =====
async function switchToTab(tabId) {
  if (!tabId) return;

  try {
    await chrome.tabs.update(tabId, { active: true });
    const tab = await chrome.tabs.get(tabId);
    await chrome.windows.update(tab.windowId, { focused: true });
    closeIframe();
  } catch (err) {
    console.error("Failed to switch tab:", err);
  }
}

function closeIframe() {
  if (window.top !== window.self) {
    window.parent.postMessage({ action: "closeIframe" }, "*");
  } else {
    document.getElementById("extension-iframe-overlay")?.remove();
  }
}

// ===== Selection Management =====
function updateSelection() {
  document.querySelectorAll(".result-item").forEach((item, index) => {
    item.classList.toggle("selected", index === selectedIndex);
  });

  const selected = document.querySelector(".result-item.selected");
  if (selected) {
    selected.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (currentResults[selectedIndex]) {
      showPreview(currentResults[selectedIndex]);
    }
  }
}

function moveSelection(direction) {
  if (!currentResults.length) return;

  if (direction === "next") {
    selectedIndex =
      selectedIndex >= currentResults.length - 1 ? 0 : selectedIndex + 1;
  } else if (direction === "prev") {
    selectedIndex =
      selectedIndex <= 0 ? currentResults.length - 1 : selectedIndex - 1;
  } else if (direction === "down") {
    selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
  } else if (direction === "up") {
    selectedIndex = Math.max(selectedIndex - 1, 0);
  }

  updateSelection();
}

// ===== Utilities =====
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== Keyboard Navigation =====
const keyboardHandlers = {
  Escape: () => {
    closeIframe();
  },
  Tab: (e) => {
    e.preventDefault();
    moveSelection(e.shiftKey ? "prev" : "next");
  },
  ArrowDown: (e) => {
    e.preventDefault();
    moveSelection("down");
  },
  ArrowUp: (e) => {
    e.preventDefault();
    moveSelection("up");
  },
  Enter: (e) => {
    e.preventDefault();
    if (selectedIndex >= 0 && currentResults[selectedIndex]) {
      switchToTab(currentResults[selectedIndex].id);
    }
  },
};

document.addEventListener("keydown", (e) => {
  keyboardHandlers[e.key]?.(e);
});

// ===== Message Handling =====
// Handle focus request from parent (due to CSP restriction on autofocus in iframes)
window.addEventListener("message", (event) => {
  if (event.data?.action === "focusSearch") {
    searchInput?.focus();
  }
});
