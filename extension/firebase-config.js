// IMPORTANT: You MUST replace these with your actual Firebase project configuration
// This is the same config from your .env file. This duplication is necessary
// because the extension runs in a separate environment and cannot access .env files.

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This is the base URL where your Mäti web app is running.
// It's used by the extension to scrape metadata from links.
export const MATI_BASE_URL = 'http://localhost:9002';
