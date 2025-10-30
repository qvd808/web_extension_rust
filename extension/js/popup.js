// popup.js
const listOfCommands = [
  {
    name: "FuzzyFinder",
    keybind: "ffq"
  }
];

// Convert keybinds to an array of keys
const commands = listOfCommands.map(cmd => {
  return {
    name: cmd.name,
    keys: cmd.keybind
      .replace(/<space>/gi, ' ')
      .split('')
      .map(k => k.toLowerCase())
  };
});

let buffer = [];
const maxSequenceLength = Math.max(...commands.map(c => c.keys.length));
const maxTime = 500;

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  const timestamp = Date.now();

  // Add key with timestamp
  buffer.push({ key, timestamp });

  // Keep buffer within max sequence length
  if (buffer.length > maxSequenceLength) buffer.shift();

  // Check all commands
  for (const cmd of commands) {
    const lastKeys = buffer.slice(-cmd.keys.length);
    const keysOnly = lastKeys.map(k => k.key);
    const timeDiff = lastKeys[lastKeys.length - 1].timestamp - lastKeys[0].timestamp;

    if (arraysEqual(keysOnly, cmd.keys) && timeDiff <= maxTime) {
      console.log(`Command triggered: ${cmd.name}`);
      buffer = [];
      break;
    }
  }
});

// Helper to compare arrays
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

document.getElementById("getTabsBtn").addEventListener("click", async () => {
  console.log("Hello world");
  const response = await chrome.runtime.sendMessage({
    action: "getAllTabs",
  });
  console.log(response);
});