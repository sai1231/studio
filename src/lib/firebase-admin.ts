
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { addLog } from '@/services/loggingService';

let adminApp: admin.app.App | null = null;

/**
 * Initializes the Firebase Admin SDK, but only if it hasn't been initialized already.
 * This lazy initialization prevents race conditions and re-initialization errors during server hot-reloads.
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
  
  addLog('INFO', "Attempting to initialize Firebase Admin SDK for the first time...");

  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
  
  if (!fs.existsSync(serviceAccountPath)) {
    const errorMessage = "Firebase service account file not found.";
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

    addLog('INFO', "Initializing Firebase Admin App with credentials from file...", { projectId: serviceAccount.project_id });

    // Use admin.initializeApp() directly to maintain context
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    if (!admin.apps[0]) {
      throw new Error("admin.initializeApp was called but no app was returned.");
    }
    
    adminApp = admin.apps[0];
    addLog('INFO', "Firebase Admin SDK initialized successfully.");
    return adminApp;

  } catch (error: any) {
    let detail = error.message;
    if (error instanceof SyntaxError) {
        detail = "The service account JSON is not formatted correctly. Please ensure it's valid JSON."
    }
    addLog('ERROR', `Critical error initializing Firebase Admin SDK from service-account.json.`, { errorDetail: detail, errorStack: error.stack });
    throw new Error(`Error initializing Firebase Admin SDK from service-account.json: ${detail}`);
  }
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
