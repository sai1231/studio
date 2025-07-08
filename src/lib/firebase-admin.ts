import * as admin from 'firebase-admin';

/**
 * Initializes the Firebase Admin SDK, but only if it hasn't been initialized already.
 * This lazy initialization prevents race conditions during server startup.
 * @returns The initialized Firebase Admin App instance.
 */
function initializeAdminApp(): admin.app.App {
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    throw new Error("Firebase Admin SDK credentials are not set. Please set FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON in your .env file.");
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log("Initializing Firebase Admin SDK...");
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error: any) {
    throw new Error(`Error initializing Firebase Admin SDK: ${error.message}. Please ensure the service account JSON in your .env file is a valid, single-line string.`);
  }
}

/**
 * Gets the Firebase Admin Storage instance, initializing the app if necessary.
 * @returns The Firebase Admin Storage service.
 */
export function getAdminStorage() {
  const app = initializeAdminApp();
  return app.storage();
}

/**
 * Gets the Firebase Admin Firestore instance, initializing the app if necessary.
 * @returns The Firebase Admin Firestore service.
 */
export function getAdminDb() {
  const app = initializeAdminApp();
  return app.firestore();
}

/**
 * Gets the Firebase Admin Auth instance, initializing the app if necessary.
 * @returns The Firebase Admin Auth service.
 */
export function getAdminAuth() {
  const app = initializeAdminApp();
  return app.auth();
}
