
'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, ShieldCheck, Server, Megaphone, Shield, LogOut, HardDrive, CreditCard } from 'lucide-react';
import type React from 'react';
import { getAuth, signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/core/theme-toggle";

const adminNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/roles', label: 'Roles', icon: ShieldCheck },
  { href: '/plans', label: 'Plans', icon: CreditCard },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/logs', label: 'Logs', icon: Server },
  { href: '/system', label: 'System', icon: HardDrive },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: 'Logout Failed', description: 'Could not log you out. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto py-2">
        <div className="flex items-center gap-4 border-b pb-4 mb-8">
            <Shield className="h-10 w-10 text-primary" />
            <div>
                <h1 className="text-3xl font-headline font-semibold">Admin Portal</h1>
                <p className="text-muted-foreground">Manage users, application settings, and monitor system health.</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-10 items-start">
            <aside className="w-full">
            <nav className="flex flex-col gap-1">
                {adminNavItems.map((item) => (
                <Link key={item.label} href={item.href}>
                    <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start gap-3",
                        pathname.startsWith(item.href) ? "bg-muted font-semibold" : ""
                    )}
                    >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    </Button>
                </Link>
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
