// popup.js - Just button and display
document.getElementById("getTabsBtn").addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({
    action: "getAllTabs",
  });
  console.log(response);
});
