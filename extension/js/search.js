// extension/js/search.js
const searchInput = document.getElementById("search-input");
const resultsContainer = document.getElementById("results-container");
const previewTitle = document.querySelector(".preview-title");
const previewContent = document.querySelector(".preview-content");

let selectedIndex = -1;
let currentResults = [];

// Handle search input
let rafScheduled = false;
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
      query: query,
    });
    currentResults = response || [];
    selectedIndex = currentResults.length > 0 ? 0 : -1;
    renderResults(currentResults);
  } catch (err) {
    console.error("Search failed:", err);
  }
}

function renderResults(results) {
  if (!results || results.length === 0) {
    resultsContainer.innerHTML =
      '<div class="no-results">No matching tabs</div>';
    selectedIndex = -1;
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

  // Add hover listeners for preview
  document.querySelectorAll(".result-item").forEach((item) => {
    item.addEventListener("mouseenter", (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      showPreview(currentResults[index]);
    });

    item.addEventListener("click", (e) => {
      const index = parseInt(e.currentTarget.dataset.index);
      switchToTab(currentResults[index].id);
    });
  });

  // Show preview of first selected item
  if (selectedIndex >= 0 && currentResults[selectedIndex]) {
    showPreview(currentResults[selectedIndex]);
  }
}

function showPreview(tab) {
  if (!tab) {
    previewTitle.textContent = "Preview";
    previewContent.textContent = "No tab selected";
    return;
  }

  // Format last accessed date
  let lastAccessedText = "Unknown";
  if (tab.last_accessed) {
    const date = new Date(tab.last_accessed);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      lastAccessedText = "Just now";
    } else if (diffMins < 60) {
      lastAccessedText = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      lastAccessedText = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      lastAccessedText = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else {
      lastAccessedText = date.toLocaleString();
    }
  }

  previewTitle.textContent = tab.title || "Untitled";
  previewContent.innerHTML = `
    <!-- <div style="margin-bottom: 12px;"> -->
    <!--   <strong>Title:</strong> ${tab.title || "Unknown"} -->
    <!-- </div> -->
    <div style="margin-bottom: 12px;">
      <strong>Tab ID:</strong> ${tab.id || "Unknown"}
    </div>
    <div style="margin-bottom: 12px;">
      <strong>Group:</strong> ${escapeHtml(tab.group_title || "No group")}
    </div>
    <div style="margin-bottom: 12px;">
      <strong>Last Accessed:</strong> ${lastAccessedText}
    </div>
    <div>
      <strong>URL:</strong><br>
      <span style="word-break: break-all; color: #569cd6;">${escapeHtml(tab.url || "")}</span>
    </div>
  `;
}

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
    const overlay = document.getElementById("extension-iframe-overlay");
    if (overlay) overlay.remove();
  }
}

function updateSelection() {
  document.querySelectorAll(".result-item").forEach((item, index) => {
    item.classList.toggle("selected", index === selectedIndex);
  });

  // Scroll selected item into view
  const selected = document.querySelector(".result-item.selected");
  if (selected) {
    selected.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // Show preview of selected item
    if (currentResults[selectedIndex]) {
      showPreview(currentResults[selectedIndex]);
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeIframe();
  } else if (e.key === "Tab") {
    e.preventDefault();
    if (currentResults.length === 0) return;

    if (e.shiftKey) {
      // Shift+Tab: go backwards
      selectedIndex =
        selectedIndex <= 0 ? currentResults.length - 1 : selectedIndex - 1;
    } else {
      // Tab: go forwards
      selectedIndex =
        selectedIndex >= currentResults.length - 1 ? 0 : selectedIndex + 1;
    }
    updateSelection();
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (currentResults.length === 0) return;
    selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
    updateSelection();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (currentResults.length === 0) return;
    selectedIndex = Math.max(selectedIndex - 1, 0);
    updateSelection();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (selectedIndex >= 0 && currentResults[selectedIndex]) {
      switchToTab(currentResults[selectedIndex].id);
    }
  }
});

window.addEventListener("message", (event) => {
  if (event.data && event.data.action === "focusSearch") {
    if (searchInput) {
      searchInput.focus();
    }
  }
});
