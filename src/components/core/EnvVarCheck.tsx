
'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const EnvVarCheck = () => {
  const isConfigMissing = !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!isConfigMissing) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <Terminal className="h-4 w-4" />
      <AlertTitle>Action Required: Firebase Configuration Missing</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          Your app cannot connect to Firebase because the necessary environment variables are missing. File uploads and data saving will fail until this is resolved.
        </p>
        <p className="mb-1">
          <strong>How to fix:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Firebase Console</a> and select your project.</li>
          <li>Click the gear icon (Project settings) next to "Project Overview".</li>
          <li>Under the "General" tab, scroll down to "Your apps".</li>
          <li>Select the "Web" app (or create one if you haven't).</li>
          <li>Find the `firebaseConfig` object and copy the values.</li>
          <li>Paste these values into the `.env` file in your project's root directory, matching them with the `NEXT_PUBLIC_FIREBASE_*` keys.</li>
        </ol>
        <p className="mt-3 text-xs">
            After updating the `.env` file, you may need to restart the development server for the changes to take effect.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default EnvVarCheck;
