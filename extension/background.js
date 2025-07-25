import { MATI_BASE_URL } from './config.js';
import { getCurrentUserToken } from './auth.js';

// Function to send data to the backend API
const saveToMatiAPI = async (payload) => {
  try {
    const token = await getCurrentUserToken();
    if (!token) {
      chrome.notifications.create({
          type: 'basic',
          iconUrl: 'logo-128.png',
          title: 'Not Signed In',
          message: 'Please sign in to the Mati extension first.'
      });
      return;
    }
    
    const response = await fetch(`${MATI_BASE_URL}/api/extension/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
       chrome.notifications.create({
          type: 'basic',
          iconUrl: 'logo-128.png',
          title: 'Sent to Mati',
          message: 'Your selected text is being saved.'
      });
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server responded with ${response.status}`);
    }
  } catch(error) {
     chrome.notifications.create({
        type: 'basic',
        iconUrl: 'logo-128.png',
        title: 'Save Failed',
        message: `Could not save to Mati: ${error.message}`
    });
  }
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
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "add-to-mati" && info.selectionText) {
    saveToMatiAPI({
      selection: info.selectionText,
      source: tab ? { title: tab.title, url: tab.url } : {}
    });
  }
});
