
import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth/react-native';
import { getFirestore, type Firestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';


// IMPORTANT: Replace these with your actual Firebase project configuration
// You can copy this from your web app's .env file or the Firebase console.
const firebaseConfig: FirebaseOptions = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

// Check if the config has been populated
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && firebaseConfig.projectId !== "YOUR_PROJECT_ID_HERE";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isFirebaseConfigured) {
  // Initialize Firebase
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  // Use initializeAuth with persistence to keep users logged in
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
  db = getFirestore(app);
} else {
  // Use dummy objects if not configured to avoid crashing the app
  app = null as any;
  auth = null as any;
  db = null as any;
}

export { app, auth, db };
