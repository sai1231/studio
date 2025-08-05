

'use client';

import type React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MatiLogo from '@/components/core/mati-logo';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
        // If a pending action from the extension exists, it will be handled
        // by the ExtensionSaveHandler in the main app layout. We just need to
        // redirect to a page where that layout is active.
        router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  // While checking auth state or if a user is found (and we're about to redirect),
  // show a loading screen to prevent the login form from flashing.
  if (isLoading || user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If not loading and no user, show the login/signup page.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="mb-8">
        <MatiLogo iconSize={32} textSize="text-3xl" showName={true} />
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
