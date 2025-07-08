import * as admin from 'firebase-admin';

const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
    console.warn("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not set. Admin SDK will not be initialized.");
}

// Check if the default app is already initialized to prevent re-initialization
if (!admin.apps.length && serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK. Ensure the service account JSON is valid.", error);
  }
}

const adminAuth = admin.apps.length ? admin.auth() : null;
const adminDb = admin.apps.length ? admin.firestore() : null;
const adminStorage = admin.apps.length ? admin.storage() : null;

export { adminAuth, adminDb, adminStorage };
