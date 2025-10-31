if (!window.keybindListenerInstalled) {
  window.keybindListenerInstalled = true;

  console.log("content.js loaded");

  // 1️⃣ Define your commands
  const listOfCommands = [
    { name: "FuzzyFinder", keybind: "ffq" },
    // Add more commands here
  ];

  const commands = listOfCommands.map((cmd) => ({
    name: cmd.name,
    keys: cmd.keybind
      .replace(/<space>/gi, " ")
      .split("")
      .map((k) => k.toLowerCase()),
  }));

  const maxSequenceLength = Math.max(...commands.map((c) => c.keys.length));
  const maxTime = 500; // ms between first and last key

  // 2️⃣ Circular buffer
  const circularBuffer = new Array(maxSequenceLength);
  let pointer = 0;
  let bufferSize = 0;

  function addKey(key) {
    circularBuffer[pointer] = { key, timestamp: Date.now() };
    pointer = (pointer + 1) % maxSequenceLength;
    if (bufferSize < maxSequenceLength) bufferSize++;
  }

  // 3️⃣ Wrap sendMessage in a promise to allow async/await
  function sendMessageAsync(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  // 4️⃣ Process buffer in batch
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

      if (keysOnly.every((k, i) => k === cmd.keys[i]) && timeDiff <= maxTime) {
        try {
          const response = await sendMessageAsync({
            action: "commandTriggered",
            command: cmd.name,
          });
          console.log("Background response:", response);
        } catch (err) {
          console.error("Failed to send message to background:", err);
        }

        bufferSize = 0; // clear buffer after trigger
        break;
      }
    }

    batchScheduled = false;
  }

  // 5️⃣ Keydown handler
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

  document.addEventListener("keydown", keydownHandler);

  // 6️⃣ Cleanup listener when tab becomes inactive
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "cleanup") {
      console.log("Cleaning up key listener");
      document.removeEventListener("keydown", keydownHandler);
      window.keybindListenerInstalled = false;
    }
  });
}
