import { MATI_BASE_URL } from './config.js';
import { onUserChanged, signIn, signOut, getCurrentUserToken } from './auth.js';
import { isFirebaseConfigured } from './firebase-config.js';
export const dynamic = 'force-dynamic';
const loadingView = document.getElementById('loading-view');
const loginView = document.getElementById('login-view');
const saveView = document.getElementById('save-view');

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const savePageBtn = document.getElementById('save-page-btn');
const statusMessage = document.getElementById('status-message');

function showView(viewId) {
    ['loading-view', 'login-view', 'save-view'].forEach(id => {
        document.getElementById(id).style.display = (id === viewId) ? 'flex' : 'none';
    });
}

async function saveContent(payload) {
    statusMessage.textContent = 'Saving...';
    savePageBtn.disabled = true;

    try {
        const token = await getCurrentUserToken();
        if (!token) {
            throw new Error('You are not signed in.');
        }

        const response = await fetch(`${MATI_BASE_URL}/api/extension/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save content.');
        }

        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'logo-128.png',
            title: 'Saved to Mati',
            message: `"${payload.title || 'Content'}" has been saved.`
        });
        
        window.close();
    } catch (error) {
        statusMessage.textContent = error.message;
        statusMessage.classList.add('error');
    } finally {
        savePageBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!isFirebaseConfigured) {
        showView('login-view');
        statusMessage.textContent = 'Firebase not configured.';
        statusMessage.classList.add('error');
        loginBtn.disabled = true;
        return;
    }

    onUserChanged(user => {
        if (user) {
            showView('save-view');
        } else {
            showView('login-view');
        }
    });

    loginBtn.addEventListener('click', async () => {
        try {
            await signIn();
            // onUserChanged will handle the view switch
        } catch (error) {
            statusMessage.textContent = 'Sign in failed. Please try again.';
            statusMessage.classList.add('error');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await signOut();
        // onUserChanged will handle the view switch
    });

    savePageBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.url) throw new Error("Cannot save this page.");

            saveContent({
                url: tab.url,
                title: tab.title || ''
            });
        } catch (error) {
            statusMessage.textContent = `Error: ${error.message}`;
            statusMessage.classList.add('error');
        }
    });
});
