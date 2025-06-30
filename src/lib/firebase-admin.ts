import * as admin from 'firebase-admin';

// In a managed environment like App Hosting or Cloud Functions,
// initializeApp() can be called without arguments.
// It automatically discovers service account credentials and other configuration.
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export the initialized admin instance and specific services
const adminStorage = admin.storage();

export { admin, adminStorage };
