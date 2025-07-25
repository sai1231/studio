// Function to create a new tab in the background to handle the save action
const createSaveTab = (params) => {
  const url = new URL("http://localhost:9002/dashboard");
  for (const key in params) {
    url.searchParams.set(key, params[key]);
  }
  
  chrome.tabs.create({
    url: url.href,
    active: false // This is the key: open the tab in the background
  });
};

// Create Context Menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-mati",
    title: "Add selection to Mati",
    contexts: ["selection"]
  });
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "add-to-mati" && info.selectionText) {
    createSaveTab({
      action: 'save',
      selection: info.selectionText,
      source: 'extension-context-menu'
    });
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'logo-128.png',
        title: 'Sent to Mati',
        message: 'Your selected text is being saved.'
    });
  }
});
