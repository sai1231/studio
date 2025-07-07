// This is the base URL of your Mäti web application.
// Change this if you deploy your app to a different domain.
const MATI_BASE_URL = 'http://localhost:9002';

document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('save-page-btn');
  const statusMessage = document.getElementById('status-message');

  saveButton.addEventListener('click', () => {
    saveButton.disabled = true;
    statusMessage.textContent = 'Opening Mäti...';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https://'))) {
        const title = encodeURIComponent(tab.title || 'Untitled');
        const url = encodeURIComponent(tab.url);
        
        // This opens the web app. The web app itself will handle the authentication check
        // and the save logic.
        chrome.tabs.create({
          url: `${MATI_BASE_URL}/dashboard?action=addFromExtension&type=link&url=${url}&title=${title}`
        });
        
        // Close the popup after sending the request.
        setTimeout(() => window.close(), 500);

      } else {
        statusMessage.textContent = 'Cannot save this page.';
        saveButton.disabled = false;
      }
    });
  });
});
