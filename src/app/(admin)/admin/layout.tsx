
'use client';

import type React from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import AdminAppShell from '@/components/core/AdminAppShell';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't perform any redirects until the auth state is fully resolved.
    if (isLoading) {
      return;
    }

    const isLoginPage = pathname === '/admin/login';

    // If the user IS an admin but they have landed on the login page,
    // they should be redirected to the dashboard.
    if (isAdmin && isLoginPage) {
      router.replace('/admin/dashboard');
    }
    
    // If the user is NOT an admin and they are trying to access a protected page,
    // send them to the login page.
    if (!isAdmin && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [isLoading, isAdmin, pathname, router]);

  // While checking auth status, show a full-screen loader.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const isLoginPage = pathname === '/admin/login';

  // If the user is an admin and not on the login page, show the app shell.
  // The useEffect handles redirecting them away from the login page if necessary.
  if (isAdmin && !isLoginPage) {
    return (
        <AdminAppShell>
            {children}
        </AdminAppShell>
    );
  }

  // If the user is NOT an admin and IS on the login page, show the login page content.
  if (!isAdmin && isLoginPage) {
      return <>{children}</>;
  }

  // This is the crucial fallback. During a state transition (e.g., redirecting
  // from /login to /dashboard), none of the above conditions might be met for a
  // single render cycle. This loader prevents a flash of incorrect content.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
