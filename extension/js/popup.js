// Import WASM module
import initWasmModule, { show_alert } from "./wasm/wasm_mod.js";

// Initialize WASM and set up button
(async () => {
  try {
    // Initialize WASM
    await initWasmModule();
    console.log("Popup: WASM module loaded!");

    // Get button and output elements
    const button = document.getElementById("helloBtn");
    const output = document.getElementById("output");

    // Add click handler
    button.addEventListener("click", () => {
      // Call WASM function
      const response = show_alert("World");

      // Show browser alert
      alert("Hello World from Rust/WASM! 🦀");

      // Display in popup
      output.textContent = response;

      // Send message to background script
      chrome.runtime.sendMessage(
        { action: "hello", data: response },
        (response) => {
          console.log("Got response from background:", response);
        },
      );
    });

    // Show ready message
    output.textContent = "✅ WASM Ready! Click the button above.";
  } catch (error) {
    console.error("Failed to initialize:", error);
    document.getElementById("output").textContent = "❌ Error loading WASM";
  }
})();
