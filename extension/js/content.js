// Prevent multiple listeners in the same context
if (!window.keybindListenerInstalled) {
  window.keybindListenerInstalled = true;

  console.log("content.js loaded");

  // Define keybinds
  const listOfCommands = [{ name: "FuzzyFinder", keybind: "ffq" }];

  const commands = listOfCommands.map((cmd) => ({
    name: cmd.name,
    keys: cmd.keybind
      .replace(/<space>/gi, " ")
      .split("")
      .map((k) => k.toLowerCase()),
  }));

  let buffer = [];
  const maxSequenceLength = Math.max(...commands.map((c) => c.keys.length));
  const maxTime = 500;

  // Named function for easier removal
  function keyListener(e) {
    const key = e.key.toLowerCase();
    const timestamp = Date.now();

    buffer.push({ key, timestamp });
    if (buffer.length > maxSequenceLength) buffer.shift();

    for (const cmd of commands) {
      const lastKeys = buffer.slice(-cmd.keys.length);
      const keysOnly = lastKeys.map((k) => k.key);
      const timeDiff =
        lastKeys[lastKeys.length - 1].timestamp - lastKeys[0].timestamp;

      if (arraysEqual(keysOnly, cmd.keys) && timeDiff <= maxTime) {
        console.log(`Command triggered: ${cmd.name}`);
        buffer = [];
        break;
      }
    }
  }

  document.addEventListener("keydown", keyListener);

  // Helper function to compare arrays
  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  // Listen for cleanup message from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "cleanup") {
      console.log("Cleaning up key listener");
      document.removeEventListener("keydown", keyListener);
      window.keybindListenerInstalled = false;
    }
  });
}
