
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Zap, Server, ToggleRight, Megaphone, Shield } from 'lucide-react';
import type React from 'react';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/plans', label: 'Plans', icon: Zap },
  { href: '/admin/logs', label: 'Logs', icon: Server },
  { href: '/admin/feature-flags', label: 'Feature Flags', icon: ToggleRight },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto py-2">
        <div className="flex items-center gap-4 border-b pb-4 mb-8">
            <Shield className="h-10 w-10 text-primary" />
            <div>
                <h1 className="text-3xl font-headline font-semibold">Admin Portal</h1>
                <p className="text-muted-foreground">Manage users, application settings, and monitor system health.</p>
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
