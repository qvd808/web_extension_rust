// popup.js - Just button and display
document.getElementById("helloBtn").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({
    action: "process",
    data: "World",
  });
});
