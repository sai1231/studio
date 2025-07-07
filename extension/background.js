import { firebaseConfig, MATI_BASE_URL } from './firebase-config.js';

// Since we are in a service worker, we can use the modular Firebase SDK from the CDN
try {
  importScripts(
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
  );
} catch (e) {
  console.error(e);
}

let app;
if (firebaseConfig.apiKey !== 'YOUR_API_KEY_HERE') {
  app = firebase.initializeApp(firebaseConfig);
}

const isValidUrl = (s) => { try { new URL(s); return true; } catch (_) { return false; } };

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
    saveContent({
      type: 'note',
      text: info.selectionText
    });
  }
});

// --- POPUP COMMUNICATION ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'savePage') {
    saveContent({
      type: 'link',
      url: request.url,
      title: request.title
    });
  }
  return true; // Indicates we will send a response asynchronously
});

// --- CORE SAVING LOGIC ---
async function saveContent(content) {
  const currentUser = firebase.auth().currentUser;

  if (!app) {
    showNotification('Not Configured', 'The extension has not been configured with Firebase credentials.');
    return;
  }
  if (!currentUser) {
    showNotification('Not Logged In', 'Please log in to Mäti via the extension icon first.');
    return;
  }

  try {
    let contentData = {
      userId: currentUser.uid,
      tags: [],
      status: 'pending-analysis',
    };

    if (content.type === 'link') {
      const { url, title } = content;
      // Scrape metadata before saving
      const response = await fetch(`${MATI_BASE_URL}/api/scrape-metadata?url=${encodeURIComponent(url)}`);
      let metadata = { title, description: '', faviconUrl: '', imageUrl: '' };
      if (response.ok) {
        metadata = await response.json();
      }
      
      contentData = {
        ...contentData,
        type: 'link',
        url: url,
        title: metadata.title || title,
        description: metadata.description,
        faviconUrl: metadata.faviconUrl,
        imageUrl: metadata.imageUrl,
        domain: new URL(url).hostname.replace(/^www\./, ''),
      };
    } else if (content.type === 'note') {
      const { text } = content;
      const generatedTitle = text.split(' ').slice(0, 5).join(' ') + '...';
      contentData = {
        ...contentData,
        type: 'note',
        title: generatedTitle,
        description: text,
      };
    }
    
    await firebase.firestore().collection('content').add({
        ...contentData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showNotification('Saved to Mäti!', contentData.title);

  } catch (error) {
    console.error('Failed to save content:', error);
    showNotification('Save Failed', 'Could not save the content to Mäti.', true);
  }
}

function showNotification(title, message, isError = false) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: isError ? 'images/icon48-error.png' : 'images/icon48.png', // You would need to create these icon files
    title: title,
    message: message,
    priority: 2,
  });
}
