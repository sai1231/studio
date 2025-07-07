
'use client';

import type React from 'react';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoading && user) {
      // After login, check if there was a pending action from the extension
      const pendingAction = sessionStorage.getItem('mati_extension_pending_action');
      if (pendingAction) {
        sessionStorage.removeItem('mati_extension_pending_action');
        router.replace(`/dashboard?${pendingAction}`);
      } else {
        router.replace('/dashboard');
      }
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
        <MatiLogo iconSize={32} textSize="text-3xl" />
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
