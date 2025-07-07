// IMPORTANT: Replace these with your actual Firebase project configuration.
// You can copy this from your web app's .env file.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

// Check if the config has been populated by verifying the two most critical fields.
export const isFirebaseConfigured = 
  firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
  firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID_HERE";
