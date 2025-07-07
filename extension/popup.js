document.addEventListener('DOMContentLoaded', () => {
  const saveButton = document.getElementById('save-page-btn');
  const statusMessage = document.getElementById('status-message');

  saveButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https://'))) {
        const title = encodeURIComponent(tab.title || 'Untitled');
        const url = encodeURIComponent(tab.url);
        // This opens the web app, which will handle the save.
        // The user must be logged into the web app in their browser.
        chrome.tabs.create({
          url: `http://localhost:9002/dashboard?action=addFromExtension&type=link&url=${url}&title=${title}`
        });
        
        statusMessage.textContent = 'Sending to Mäti...';
        setTimeout(() => window.close(), 500);

      } else {
        statusMessage.textContent = 'Cannot save this page.';
      }
    });
  });
});
