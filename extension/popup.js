import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

// --- DOM Elements ---
const loadingView = document.getElementById('loading-view');
const loginView = document.getElementById('login-view');
const saveView = document.getElementById('save-view');
const loginBtn = document.getElementById('login-btn');
const savePageBtn = document.getElementById('save-page-btn');
const pageTitleEl = document.getElementById('page-title');
const pageUrlEl = document.getElementById('page-url');
const statusMessage = document.getElementById('status-message');

// --- Firebase Initialization ---
let app, auth, db, currentUser;

if (isFirebaseConfigured) {
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
}

// --- Functions ---

function showView(view) {
  loadingView.style.display = 'none';
  loginView.style.display = 'none';
  saveView.style.display = 'none';
  view.style.display = 'flex';
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.className = isError ? 'status error' : 'status';
}

async function savePage() {
  if (!currentUser) {
    setStatus('You are not logged in.', true);
    return;
  }
  savePageBtn.disabled = true;
  setStatus('Saving...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.url.startsWith('http')) {
      throw new Error('Cannot save this type of page.');
    }
    await firebase.firestore(app).collection('content').add({
      userId: currentUser.uid,
      type: 'link',
      url: tab.url,
      title: tab.title || tab.url,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'pending-analysis',
      tags: []
    });
    setStatus('Saved!');
    setTimeout(() => window.close(), 750);
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
    savePageBtn.disabled = false;
  }
}

async function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    // onAuthStateChanged will handle the UI update
  } catch (error) {
    setStatus('Login failed. Please try again.', true);
    console.error("Login failed:", error);
  }
}

// --- Main Logic ---

document.addEventListener('DOMContentLoaded', () => {
    if (!isFirebaseConfigured) {
        showView(loadingView);
        setStatus('Extension not configured.', true);
        return;
    }

    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            pageTitleEl.textContent = tab.title;
            pageUrlEl.textContent = tab.url;
            showView(saveView);
        } else {
            showView(loginView);
        }
    });

    loginBtn.addEventListener('click', handleGoogleLogin);
    savePageBtn.addEventListener('click', savePage);
});
