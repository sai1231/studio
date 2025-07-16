
'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Server, Megaphone, Shield, LogOut, ShieldCheck, CreditCard, HardDrive, Filter } from 'lucide-react';
import type React from 'react';
import { getAuth, signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/core/theme-toggle";

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/roles', label: 'Roles', icon: ShieldCheck },
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  {
    label: 'System',
    icon: HardDrive,
    subItems: [
      { href: '/admin/system', label: 'Meilisearch' },
      { href: '/admin/system/classifier', label: 'Classifier' },
    ],
  },
  { href: '/admin/logs', label: 'Logs', icon: Server },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
];

export default function AdminAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/admin/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: 'Logout Failed', description: 'Could not log you out. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="w-full p-2">
        <div className="flex items-center gap-3 border-b pb-2 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <div>
                <h1 className="text-xl font-headline font-semibold">Admin Portal</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-start">
            <aside className="w-full">
            <nav className="flex flex-col gap-1">
                {adminNavItems.map((item) => (
                  <div key={item.label}>
                    {item.subItems ? (
                      <div>
                        <div className="flex items-center gap-3 px-3 py-2 text-sm font-semibold">
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </div>
                        <div className="pl-4">
                          {item.subItems.map(subItem => (
                            <Link key={subItem.label} href={subItem.href}>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start gap-3",
                                  pathname === subItem.href ? "bg-muted font-semibold" : ""
                                )}
                              >
                                {subItem.label}
                              </Button>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Link href={item.href!}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3",
                            pathname.startsWith(item.href!) ? "bg-muted font-semibold" : ""
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
            </nav>
            </aside>
            <main className="w-full">
            {children}
            </main>
        </div>
    </div>
  );
}
