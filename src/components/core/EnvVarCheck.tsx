
'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const REQUIRED_ENV_VARS: { key: keyof NodeJS.ProcessEnv; name: string; purpose: string }[] = [
  { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', name: 'API Key', purpose: 'General authentication.' },
  { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', name: 'Auth Domain', purpose: 'User sign-in and authentication.' },
  { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', name: 'Project ID', purpose: 'Connecting to your Firebase project and database.' },
  { key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', name: 'Storage Bucket', purpose: 'Required for file and image uploads.' },
];

const EnvVarCheck = () => {
  const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v.key]);

  if (missingVars.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <Terminal className="h-4 w-4" />
      <AlertTitle>Action Required: Firebase Configuration Incomplete</AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          Your app cannot fully connect to Firebase because some environment variables are missing. The following features will fail until this is resolved:
        </p>
        <ul className="list-disc list-inside mb-3 space-y-1">
            {missingVars.map(v => (
                <li key={v.key}>
                    <strong>Missing <code>{v.key}</code></strong>: {v.purpose}
                </li>
            ))}
        </ul>
        <p className="mb-1">
          <strong>How to fix:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Firebase Console</a> and select your project.</li>
          <li>Click the gear icon (Project settings) next to "Project Overview".</li>
          <li>Under the "General" tab, scroll down to "Your apps".</li>
          <li>Select the "Web" app (or create one if you haven't).</li>
          <li>Find the <code>firebaseConfig</code> object and copy the values.</li>
          <li>Paste these values into the <code>.env</code> file in your project's root directory, matching them with the corresponding <code>NEXT_PUBLIC_FIREBASE_*</code> keys.</li>
        </ol>
        <p className="mt-3 text-xs">
            After updating the <code>.env</code> file, you must restart the development server for the changes to take effect.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default EnvVarCheck;
