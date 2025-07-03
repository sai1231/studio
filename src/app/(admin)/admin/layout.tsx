
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
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // Wait until the authentication status is fully determined.
    if (isLoading) {
      return;
    }

    // If the user is NOT an admin and they are trying to access any page
    // other than the login page, redirect them to the login page.
    if (!isAdmin && !isLoginPage) {
      router.replace('/admin/login');
    }
    
    // If the user IS an admin and they are currently on the login page,
    // they should be redirected to the dashboard.
    if (isAdmin && isLoginPage) {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, isAdmin, isLoginPage, router, pathname]);

  // While checking auth status, show a full-screen loader.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If the user is an admin, show the main application shell with the
  // appropriate page content (e.g., dashboard, users page).
  if (isAdmin) {
    return (
        <AdminAppShell>
            {children}
        </AdminAppShell>
    );
  }

  // If the user is NOT an admin but IS on the login page, show the login page.
  if (isLoginPage) {
      return <>{children}</>;
  }

  // Fallback case: If the user is not an admin and not on the login page,
  // they are in the process of being redirected by the useEffect. Show a loader
  // to prevent a flash of incorrect content.
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
