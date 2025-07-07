// Use importScripts to load Firebase libraries in a service worker context
try {
  importScripts(
    './lib/firebase-app-compat.js',
    './lib/firebase-auth-compat.js',
    './lib/firebase-firestore-compat.js',
    './firebase-config.js'
  );
} catch (e) {
  console.error("Error loading Firebase scripts in background worker.", e);
}

let app, auth, db;

if (self.isFirebaseConfigured) {
    app = firebase.initializeApp(self.firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
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
    if (!db) {
        console.error("Firestore not initialized in background script.");
        return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      chrome.notifications.create({
        type: 'basic',
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
        title: 'Note Saved',
        message: `"${title}" was saved to Mäti.`
      });
    }).catch(error => {
      chrome.notifications.create({
        type: 'basic',
        title: 'Save Failed',
        message: `Could not save your note: ${error.message}`
      });
    });
  }
});
