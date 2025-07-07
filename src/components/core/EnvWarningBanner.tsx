
'use client';
import { isFirebaseConfigured } from '@/lib/firebase';
import { AlertCircle } from 'lucide-react';

export default function EnvWarningBanner() {
  if (isFirebaseConfigured) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-yellow-900 p-3 text-center text-sm font-semibold flex items-center justify-center gap-2">
      <AlertCircle className="h-5 w-5" />
      <span>
        <strong>Configuration Needed:</strong> Your app is not connected to Firebase. Please add your project credentials to the 
        <code className="bg-yellow-400/50 text-yellow-950 p-1 rounded-md text-xs mx-1">.env</code> 
        file to enable full functionality.
      </span>
    </div>
  );
}
