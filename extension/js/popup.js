// popup.js - Just button and display
document.getElementById("helloBtn").addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({
    action: "process",
    data: "World",
  });

  document.getElementById("output").textContent = response.result;
});
