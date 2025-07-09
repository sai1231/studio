
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminApp: admin.app.App | null = null;

/**
 * Initializes the Firebase Admin SDK, but only if it hasn't been initialized already.
 * This lazy initialization prevents race conditions during server startup.
 * @returns The initialized Firebase Admin App instance.
 */
function initializeAdminApp(): admin.app.App {
  if (adminApp) {
    return adminApp;
  }

  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error("Firebase service account file not found. Please create 'service-account.json' in the project root and paste your credentials there.");
  }
  
  try {
    const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountContent);

    // Check if the service account file is still the placeholder
    if (serviceAccount.comment) {
        throw new Error("The 'service-account.json' file is a placeholder. Please paste your actual Firebase service account credentials into it.");
    }
    
    console.log("Initializing Firebase Admin SDK using service-account.json file...");
    
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    
    return adminApp;

  } catch (error: any) {
    let detail = error.message;
    if (error instanceof SyntaxError) {
        detail = "The service account JSON is not formatted correctly. Please ensure it's valid JSON."
    }
    throw new Error(`Error initializing Firebase Admin SDK from service-account.json: ${detail}`);
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
