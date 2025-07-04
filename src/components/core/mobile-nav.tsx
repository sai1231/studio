'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bookmark, PlusCircle, Tag, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/context/DialogContext';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/zones', label: 'Zones', icon: Bookmark },
  { isFab: true },
  { href: '/tags', label: 'Tags', icon: Tag },
  { href: '/content-types', label: 'Types', icon: ClipboardList },
];

export function MobileNav() {
  const pathname = usePathname();
  const { setIsAddContentDialogOpen } = useDialog();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="grid h-16 grid-cols-5 items-center justify-center">
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <div key="fab" className="flex justify-center">
                <Button
                  size="icon"
                  className="rounded-full h-14 w-14 shadow-lg -mt-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                  aria-label="Add Content"
                  onClick={() => setIsAddContentDialogOpen(true)}
                >
                  <PlusCircle className="h-7 w-7" />
                </Button>
              </div>
            );
          }
          
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href!} legacyBehavior>
              <a className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors",
                isActive ? "text-primary" : "hover:text-primary"
              )}>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
