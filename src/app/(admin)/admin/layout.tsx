
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

    // If user is not an admin and they are not on the login page, redirect them.
    if (!isAdmin && !isLoginPage) {
      router.replace('/admin/login');
    }
    
    // If user IS an admin and they are on the login page, redirect them to the dashboard.
    else if (isAdmin && isLoginPage) {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, isAdmin, pathname, router]);

  // Show a loader while auth is being checked or while a redirect is imminent.
  // This prevents a "flash" of incorrect content.
  if (isLoading || (!isAdmin && pathname !== '/admin/login') || (isAdmin && pathname === '/admin/login')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not an admin, they should only see the login page content.
  if (!isAdmin && pathname === '/admin/login') {
    return <>{children}</>;
  }
  
  // If we've reached here, the user is an authorized admin on an admin page.
  return (
    <AdminAppShell>
      {children}
    </AdminAppShell>
  );
}
