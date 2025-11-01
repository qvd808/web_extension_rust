// ===== Configuration =====
var KEYBIND_CONFIG = window.KEYBIND_CONFIG;
var UI_CONFIG = window.UI_CONFIG;

// ===== Keybind Listener Setup =====
if (!window.keybindListenerInstalled) {
  window.keybindListenerInstalled = true;

  // Parse commands into searchable format
  const commands = KEYBIND_CONFIG.COMMANDS.map((cmd) => ({
    name: cmd.name,
    keys: cmd.keybind
      .replace(/<space>/gi, " ")
      .split("")
      .map((k) => k.toLowerCase()),
  }));

  const maxSequenceLength = Math.max(...commands.map((c) => c.keys.length));

  // ===== Circular Buffer =====
  const circularBuffer = new Array(maxSequenceLength);
  let pointer = 0;
  let bufferSize = 0;

  function addKey(key) {
    circularBuffer[pointer] = { key, timestamp: Date.now() };
    pointer = (pointer + 1) % maxSequenceLength;
    if (bufferSize < maxSequenceLength) bufferSize++;
  }

  // ===== Chrome API Helpers =====
  function sendMessageAsync(message) {
    return new Promise((resolve, reject) => {
      // Can we wrap this in rust so we can make this api not depend non the browser
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  // ===== Command Processing =====
  let batchScheduled = false;

  async function processCircularBuffer() {
    for (const cmd of commands) {
      if (bufferSize < cmd.keys.length) continue;

      const keysOnly = [];
      for (let i = bufferSize - cmd.keys.length; i < bufferSize; i++) {
        const idx = (pointer + i) % maxSequenceLength;
        keysOnly.push(circularBuffer[idx].key);
      }

      const timeDiff =
        circularBuffer[(pointer + bufferSize - 1) % maxSequenceLength]
          .timestamp -
        circularBuffer[
          (pointer + bufferSize - cmd.keys.length) % maxSequenceLength
        ].timestamp;

      if (
        keysOnly.every((k, i) => k === cmd.keys[i]) &&
        timeDiff <= KEYBIND_CONFIG.MAX_SEQUENCE_TIME
      ) {
        try {
          const response = await sendMessageAsync({
            action: "commandTriggered",
            command: cmd.name,
          });

          // Only inject iframe if background communication succeeded
          if (response?.success) {
            // Handle different commands
            switch (cmd.name) {
              case "FuzzyFinder":
                injectIframe(chrome.runtime.getURL("js/search.html"));
                break;
              default:
                console.log("Command executed:", cmd.name);
            }
          } else {
            console.warn("Command failed - back ground send false:");
          }
        } catch (err) {
          console.error("Failed to send message to background:", err);
        }

        bufferSize = 0; // clear buffer after trigger
        break;
      }
    }

    batchScheduled = false;
  }

  // ===== Event Handlers =====
  function keydownHandler(e) {
    const key = e.key.toLowerCase();

    // Prevent default only if key is part of any command
    // if (commands.some((cmd) => cmd.keys.includes(key))) {
    //   e.preventDefault();
    // }

    addKey(key);

    if (!batchScheduled) {
      batchScheduled = true;
      requestAnimationFrame(processCircularBuffer);
    }
  }

  // ===== Initialize Listeners =====
  document.addEventListener("keydown", keydownHandler);

  // Cleanup listener when tab becomes inactive
  // Can we wrap this in rust so we can make this api not depend non the browser
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "cleanup") {
      console.log("Cleaning up key listener");
      document.removeEventListener("keydown", keydownHandler);
      window.keybindListenerInstalled = false;
    }
  });
}

// ===== Iframe Injection =====
function injectIframe(url) {
  // Prevent duplicate iframes
  if (document.getElementById("extension-iframe-overlay")) return;

  // Create overlay backdrop
  const overlay = document.createElement("div");
  overlay.id = "extension-iframe-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "transparent",
    zIndex: UI_CONFIG?.IFRAME?.Z_INDEX || 999999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(4px)",
  });

  // Create iframe
  const iframe = document.createElement("iframe");
  iframe.src = url;
  Object.assign(iframe.style, {
    width: UI_CONFIG?.IFRAME?.WIDTH || "900px",
    height: UI_CONFIG?.IFRAME?.HEIGHT || "500px",
    border: "none",
    borderRadius: UI_CONFIG?.IFRAME?.BORDER_RADIUS || "8px",
    backgroundColor: "transparent",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
  });

  // Focus search input after iframe loads
  iframe.addEventListener("load", () => {
    setTimeout(() => {
      iframe.contentWindow.postMessage({ action: "focusSearch" }, "*");
    }, 100);
  });

  // Click outside to close
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.appendChild(iframe);
  document.body.appendChild(overlay);
}

// ===== Message Handlers =====
// Listen for close command from iframe
window.addEventListener("message", (event) => {
  if (event.data?.action === "closeIframe") {
    const overlay = document.getElementById("extension-iframe-overlay");
    overlay?.remove();
  }
});
