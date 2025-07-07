import { MATI_BASE_URL } from './config.js';

// --- CONTEXT MENU ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-mati",
    title: "Add selection to Mäti",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "add-to-mati" && info.selectionText) {
    const url = `${MATI_BASE_URL}/dashboard?action=save&type=note&content=${encodeURIComponent(info.selectionText)}`;
    chrome.tabs.create({ url: url, active: false });
  }
});
