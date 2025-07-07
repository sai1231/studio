import { MATI_BASE_URL } from './config.js';

const savePageBtn = document.getElementById('save-page-btn');
const saveStatus = document.getElementById('save-status');

savePageBtn.addEventListener('click', async () => {
    savePageBtn.disabled = true;
    saveStatus.textContent = 'Saving...';
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.url || !tab.url.startsWith('http')) {
            throw new Error('Cannot save this type of page.');
        }
        
        const url = `${MATI_BASE_URL}/dashboard?action=save&type=link&url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title)}`;
        chrome.tabs.create({ url: url, active: false });
        
        saveStatus.textContent = 'Done!';
        setTimeout(() => window.close(), 750);

    } catch(error) {
        saveStatus.textContent = error.message;
        savePageBtn.disabled = false;
    }
});
