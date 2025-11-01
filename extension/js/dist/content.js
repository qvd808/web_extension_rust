(() => {
  // extension/js/src/vim_mode.js
  console.log("Vim mode script loaded");

  // extension/js/src/main.js
  var BOOTSTRAP_FLAG = "__wer_bootstrap_installed";
  if (!globalThis[BOOTSTRAP_FLAG]) {
    globalThis[BOOTSTRAP_FLAG] = true;
    const VIM_COMMANDS = {
      immediate: [
        {
          key: "i",
          mode: "normal",
          description: "Enter insert mode",
          handler: () => {
            console.log("Enter insert mode");
            return true;
          }
        },
        {
          key: "ii",
          mode: "normal",
          description: "Test double command",
          handler: () => {
            console.log("Enter insert mode 2");
            return true;
          }
        }
      ]
    };
    const circularBuffer = new Array(10);
    let prevPointer = 0;
    let pointer = 0;
    let timeoutId = null;
    const TIMEOUT = 500;
    const handleKeydown = (e) => {
      circularBuffer[pointer] = e.key;
      pointer = (pointer + 1) % circularBuffer.length;
      let keys = "";
      let i = prevPointer;
      const sequenceIndices = [];
      while (i !== pointer) {
        keys += circularBuffer[i];
        sequenceIndices.push(i);
        i = (i + 1) % circularBuffer.length;
      }
      const matches = VIM_COMMANDS.immediate.filter(
        (cmd) => cmd.key.startsWith(keys)
      );
      if (matches.length === 0) {
        prevPointer = pointer;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        return;
      }
      if (matches.length === 1 && matches[0].key === keys) {
        prevPointer = pointer;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        matches[0].handler();
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const exactMatch = matches.find((m) => m.key === keys);
          if (exactMatch) exactMatch.handler();
          prevPointer = pointer;
          timeoutId = null;
        }, TIMEOUT);
      }
    };
    document.addEventListener("keydown", handleKeydown, { capture: true });
    chrome.runtime.onMessage.addListener(async (msg) => {
      if (msg?.action === "cleanup") {
        document.removeEventListener("keydown", handleKeydown, { capture: true });
      }
    });
  }
})();
