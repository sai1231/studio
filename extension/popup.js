document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('save-page-btn');
    const statusMessage = document.getElementById('status-message');

    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab.url) {
                    throw new Error("Cannot save this page.");
                }

                const url = new URL("http://localhost:9002/dashboard");
                url.searchParams.set('action', 'save');
                url.searchParams.set('url', tab.url);
                url.searchParams.set('title', tab.title || '');
                url.searchParams.set('source', 'extension-popup');
                
                chrome.tabs.create({
                    url: url.href,
                    active: false // Important: Open in background
                });

                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'logo-128.png',
                    title: 'Sent to Mati',
                    message: `"${tab.title || 'Page'}" is being saved.`
                });
                
                window.close(); // Close the popup immediately

            } catch (error) {
                statusMessage.textContent = `Error: ${error.message}`;
                statusMessage.style.color = 'red';
            }
        });
    }
});
