import { firebaseConfig } from './firebase-config.js';

// Elements
const loadingView = document.getElementById('loading-view');
const loginView = document.getElementById('login-view');
const saveView = document.getElementById('save-view');
const loginBtn = document.getElementById('login-btn');
const authError = document.getElementById('auth-error');
const pageTitleEl = document.getElementById('page-title');
const pageUrlEl = document.getElementById('page-url');
const savePageBtn = document.getElementById('save-page-btn');
const saveStatus = document.getElementById('save-status');

// Initialize Firebase
let app;
if (firebaseConfig.apiKey && firebaseConfig.apiKey.includes('YOUR_API_KEY')) {
  showErrorState('Firebase is not configured in firebase-config.js');
} else {
  // The firebase global is now loaded via script tags in popup.html
  app = firebase.initializeApp(firebaseConfig);
}

// Auth State Listener
if (app) {
  firebase.auth().onAuthStateChanged(user => {
    loadingView.style.display = 'none';
    if (user) {
      // User is signed in.
      loginView.style.display = 'none';
      saveView.style.display = 'block';
      setupSaveView();
    } else {
      // User is signed out.
      loginView.style.display = 'block';
      saveView.style.display = 'none';
    }
  });
}

// Event Listeners
loginBtn.addEventListener('click', async () => {
  loginBtn.disabled = true;
  authError.textContent = '';
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
    // onAuthStateChanged will handle the view switch
  } catch (error) {
    console.error("Google Sign-In error:", error);
    authError.textContent = 'Sign-in failed. Please try again.';
  } finally {
    loginBtn.disabled = false;
  }
});

savePageBtn.addEventListener('click', async () => {
    savePageBtn.disabled = true;
    saveStatus.textContent = 'Saving...';
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.url || !tab.url.startsWith('http')) {
            throw new Error('Cannot save this type of page.');
        }
        
        // Send a message to the background script to handle the saving
        await chrome.runtime.sendMessage({
            action: 'savePage',
            url: tab.url,
            title: tab.title
        });
        
        // The background script will show a notification. We can close the popup.
        saveStatus.textContent = 'Done!';
        setTimeout(() => window.close(), 750);

    } catch(error) {
        saveStatus.textContent = error.message;
        savePageBtn.disabled = false;
    }
});


// Helper Functions
function showErrorState(message) {
    loadingView.style.display = 'none';
    loginView.style.display = 'block';
    authError.textContent = message;
    loginBtn.disabled = true;
}

async function setupSaveView() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.title && tab.url) {
            pageTitleEl.textContent = tab.title;
            pageUrlEl.textContent = new URL(tab.url).hostname;
        }
        if (!tab.url || !tab.url.startsWith('http')) {
            savePageBtn.disabled = true;
            saveStatus.textContent = 'This page cannot be saved.';
        }
    } catch(e) {
        // Ignore errors for tabs like chrome://extensions
        savePageBtn.disabled = true;
        saveStatus.textContent = 'This page cannot be saved.';
    }
}
