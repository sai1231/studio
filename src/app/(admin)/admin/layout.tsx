
'use client';

import type React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ShieldCheck } from 'lucide-react';
import AdminAppShell from '@/components/core/AdminAppShell';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not an admin and not on the login page, redirect to login
  if (!isAdmin && pathname !== '/admin/login') {
    router.replace('/admin/login');
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  // If user IS an admin and on the login page, redirect to the dashboard
  if (isAdmin && pathname === '/admin/login') {
    router.replace('/admin/dashboard');
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  // If user is not an admin and on the login page, let them see it
  if (!isAdmin && pathname === '/admin/login') {
      return <>{children}</>;
  }

  // If we reach here, user is an admin and not on the login page
  return (
      <AdminAppShell>
          {children}
      </AdminAppShell>
  );
}
