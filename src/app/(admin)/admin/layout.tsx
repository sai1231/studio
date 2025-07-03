
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAuth } from 'firebase/auth';
import { Loader2, ShieldAlert } from 'lucide-react';
import AdminAppShell from '@/components/core/AdminAppShell';
import { Button } from '@/components/ui/button';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // This state helps prevent rendering a component just before a redirect happens.
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoading) return; // Wait for auth state to be resolved

    let shouldRedirect = false;

    // Case 1: Logged in, admin, but on the login page -> go to dashboard
    if (isAdmin && pathname === '/admin/login') {
      shouldRedirect = true;
      router.replace('/admin/dashboard');
    }
    
    // Case 2: Not logged in and trying to access a protected page -> go to login
    if (!user && pathname !== '/admin/login') {
      shouldRedirect = true;
      router.replace('/admin/login');
    }
    
    setIsRedirecting(shouldRedirect);

  }, [isLoading, user, isAdmin, pathname, router]);

  // Render a full-page loader if auth state is loading OR if a redirect is in progress.
  if (isLoading || isRedirecting) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If user is an admin, show the admin app shell.
  if (isAdmin) {
    return <AdminAppShell>{children}</AdminAppShell>;
  }

  // If user is not logged in and is on the login page, show it.
  if (!user && pathname === '/admin/login') {
    return <>{children}</>;
  }

  // If user is logged in but NOT an admin, show the "Access Denied" message.
  if (user && !isAdmin) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">You do not have permission to view the admin portal.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
                <Button onClick={() => router.push('/dashboard')}>Go to App Dashboard</Button>
                <Button variant="outline" onClick={async () => {
                    await getAuth().signOut();
                }}>
                    Logout & Sign in as Admin
                </Button>
            </div>
        </div>
    );
  }

  // Fallback loader for any other transient state.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
