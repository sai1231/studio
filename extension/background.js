// Import Firebase libraries and configuration as modules.
import './lib/firebase-app-compat.js';
import './lib/firebase-auth-compat.js';
import './lib/firebase-firestore-compat.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

let app, auth, db;

if (isFirebaseConfigured) {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
} else {
    console.error("Firebase is not configured in the extension. Please add your credentials to extension/firebase-config.js");
}

// Create Context Menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-mati",
    title: "Add selection to Mäti",
    contexts: ["selection"]
  });
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "add-to-mati" && info.selectionText) {
    if (!db || !auth) {
        console.error("Firestore or Auth not initialized in background script.");
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'logo-128.png',
            title: 'Mäti Error',
            message: 'Could not connect to Firebase. Please check the extension configuration.'
        });
        return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'logo-128.png',
        title: 'Not Logged In',
        message: 'Please log in to Mäti via the extension icon first.'
      });
      return;
    }

    const selection = info.selectionText;
    const title = selection.split(/\s+/).slice(0, 5).join(' ') + (selection.split(/\s+/).length > 5 ? '...' : '');

    db.collection('content').add({
      userId: currentUser.uid,
      type: 'note',
      title: title,
      description: selection,
      contentType: 'Note',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'pending-analysis',
      tags: []
    }).then(() => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'logo-128.png',
        title: 'Note Saved to Mäti',
        message: `"${title}" was saved.`
      });
    }).catch(error => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'logo-128.png',
        title: 'Save Failed',
        message: `Could not save your note: ${error.message}`
      });
    });
  }
});
