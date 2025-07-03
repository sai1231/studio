
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
    if (isLoading) {
      return; // Wait until auth state is determined
    }

    const isLoginPage = pathname === '/admin/login';

    // If user is not an admin and trying to access a protected page
    if (!isAdmin && !isLoginPage) {
      router.replace('/admin/login');
    }
    
    // If user IS an admin and they are on the login page
    if (isAdmin && isLoginPage) {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, isAdmin, pathname, router]);

  // Show a loader while auth is being checked
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const isLoginPage = pathname === '/admin/login';

  // If user is an admin, render the app shell.
  // The useEffect will handle redirecting away from the login page.
  if (isAdmin) {
    return (
        <AdminAppShell>
            {children}
        </AdminAppShell>
    );
  }

  // If not admin, only render children if on the login page. Otherwise show a loader while redirecting.
  if (!isAdmin && isLoginPage) {
      return <>{children}</>;
  }

  // Fallback loader for the redirect case (!isAdmin && !isLoginPage)
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
