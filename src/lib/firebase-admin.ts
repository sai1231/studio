import * as admin from 'firebase-admin';

// In a managed environment like App Hosting or Cloud Functions,
// initializeApp() can be called without arguments.
// It automatically discovers service account credentials and other configuration.
// We explicitly provide the storage bucket to be safe.
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

// Export the initialized admin instance and specific services
const adminStorage = admin.storage();

export { admin, adminStorage };
