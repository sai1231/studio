
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { addLog } from '@/services/loggingService';

let adminApp: admin.app.App | null = null;

/**
 * Initializes the Firebase Admin SDK, but only if it hasn't been initialized already.
 * This lazy initialization prevents race conditions and re-initialization errors during server hot-reloads.
 * It uses the recommended method for Google Cloud environments (like App Hosting) in production,
 * and falls back to a local service account file for development.
 * @returns The initialized Firebase Admin App instance.
 */
function initializeAdminApp(): admin.app.App {
  if (adminApp) {
    return adminApp;
  }
  
  if (admin.apps.length > 0 && admin.apps[0]) {
    addLog('INFO', "Firebase Admin SDK already initialized. Returning existing app.");
    adminApp = admin.apps[0];
    return adminApp;
  }
  
  addLog('INFO', "Attempting to initialize Firebase Admin SDK...");

  // In a Google Cloud environment (like App Hosting), the SDK can auto-discover credentials.
  // The GOOGLE_CLOUD_PROJECT environment variable is automatically set in these environments.
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    addLog('INFO', "Google Cloud environment detected. Initializing admin app with default credentials.");
    admin.initializeApp();
  } else {
    // Local development fallback: use the service account file.
    addLog('INFO', "Local environment detected. Initializing admin app with service account file.");
    const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      const errorMessage = "Firebase service account file not found for local development.";
      addLog('ERROR', errorMessage, { path: serviceAccountPath });
      throw new Error(`${errorMessage} Please create 'service-account.json' in the project root.`);
    }
    
    try {
      const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountContent);

      if (serviceAccount.comment && serviceAccount.comment.includes("placeholder")) {
          const errorMessage = "Placeholder service account file detected.";
          throw new Error(`The 'service-account.json' file is a placeholder. Please paste your actual Firebase service account credentials into it.`);
      }

      if (!serviceAccount.project_id) {
          throw new Error("Service account is missing 'project_id'.");
      }
      
      if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

    } catch (error: any) {
      let detail = error.message;
      if (error instanceof SyntaxError) {
          detail = "The service account JSON is not formatted correctly. Please ensure it's valid JSON."
      }
      addLog('ERROR', `Critical error initializing Firebase Admin SDK from service-account.json.`, { errorDetail: detail, errorStack: error.stack });
      throw new Error(`Error initializing Firebase Admin SDK from service-account.json: ${detail}`);
    }
  }

  if (!admin.apps[0]) {
    throw new Error("Firebase Admin SDK initialization failed.");
  }
  
  adminApp = admin.apps[0];
  addLog('INFO', "Firebase Admin SDK initialized successfully.");
  return adminApp;
}


/**
 * Gets the Firebase Admin Storage instance, initializing the app if necessary.
 * @returns The Firebase Admin Storage service.
 */
export function getAdminStorage() {
  const app = initializeAdminApp();
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    const errorMessage = 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set in .env';
    addLog('ERROR', errorMessage);
    throw new Error(errorMessage);
  }
  return app.storage().bucket(bucketName);
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
