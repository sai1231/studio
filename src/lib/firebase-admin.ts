
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { addLog } from '@/services/loggingService';

/**
 * Initializes the Firebase Admin SDK, but only if it hasn't been initialized already.
 * This lazy initialization prevents race conditions and re-initialization errors during server hot-reloads.
 * @returns The initialized Firebase Admin App instance.
 */
function initializeAdminApp(): admin.app.App {
  // Use the official way to check for existing apps to prevent re-initialization errors.
  if (admin.apps.length > 0 && admin.apps[0]) {
    addLog('INFO', "Firebase Admin SDK already initialized. Returning existing app.");
    return admin.apps[0];
  }
  
  addLog('INFO', "Attempting to initialize Firebase Admin SDK for the first time...");

  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
  addLog('INFO', `Resolved service account path: ${serviceAccountPath}`);

  if (!fs.existsSync(serviceAccountPath)) {
    const errorMessage = "Firebase service account file not found.";
    addLog('ERROR', errorMessage, { path: serviceAccountPath });
    throw new Error(`${errorMessage} Please create 'service-account.json' in the project root.`);
  }
  
  addLog('INFO', "Found service-account.json.");

  try {
    const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
    addLog('INFO', "Successfully read service-account.json file content.");
    
    const serviceAccount = JSON.parse(serviceAccountContent);

    // Check if the service account file is still the placeholder
    if (serviceAccount.comment && serviceAccount.comment.includes("placeholder")) {
        const errorMessage = "Placeholder service account file detected.";
        addLog('ERROR', errorMessage, { fileContent: serviceAccount });
        throw new Error(`The 'service-account.json' file is a placeholder. Please paste your actual Firebase service account credentials into it.`);
    }

    if (!serviceAccount.project_id) {
        const errorMessage = "Service account is missing 'project_id'.";
        addLog('ERROR', errorMessage, { parsedObject: serviceAccount });
        throw new Error(errorMessage);
    }
    
    // =================================================================
    // THE FIX: Explicitly un-escape the private key's newline characters.
    // This is the most common cause of the 'INTERNAL' error.
    // =================================================================
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        addLog('INFO', "Corrected private key newlines before initialization.");
    }

    addLog('INFO', "Initializing Firebase Admin App with credentials from file...", { projectId: serviceAccount.project_id });

    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    addLog('INFO', "Firebase Admin SDK initialized successfully.");
    return app;

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
  addLog('INFO', 'getAdminStorage called. Getting admin app instance...');
  const app = initializeAdminApp();
  addLog('INFO', 'Admin app instance retrieved. Getting storage bucket...');
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    const errorMessage = 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set in .env';
    addLog('ERROR', errorMessage);
    throw new Error(errorMessage);
  }
  addLog('INFO', `Attempting to get bucket: ${bucketName}`);
  const storage = app.storage().bucket(bucketName);
  addLog('INFO', 'Successfully got admin storage instance.');
  return storage;
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
