// IMPORTANT: Replace these with your actual Firebase project configuration.
// You can copy this from your web app's .env file.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

// Check if the config has been populated
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";
