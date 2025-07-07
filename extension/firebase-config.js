// IMPORTANT: You MUST replace these with your actual Firebase project configuration
// This is the same config from your .env file. This duplication is necessary
// because the extension runs in a separate environment and cannot access .env files.

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

// This is the base URL where your Mäti web app is running.
// It's used by the extension to scrape metadata from links.
export const MATI_BASE_URL = 'http://localhost:9002';
