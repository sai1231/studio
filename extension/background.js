// Create the context menu item when the extension is installed.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-mati",
    title: "Add selection to Mäti",
    contexts: ["selection"]
  });
});

// Handle the context menu click.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "add-to-mati" && info.selectionText) {
    const text = encodeURIComponent(info.selectionText);
    chrome.tabs.create({
      url: `http://localhost:9002/dashboard?action=addFromExtension&type=note&text=${text}`
    });
  }
});
