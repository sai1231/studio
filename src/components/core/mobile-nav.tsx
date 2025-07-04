

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bookmark, PlusCircle, ClipboardList, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/context/DialogContext';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  onNavClick: (sheet: 'zones' | 'tags' | 'types' | 'todos') => void;
}

export function MobileNav({ onNavClick }: MobileNavProps) {
  const pathname = usePathname();
  const { setIsAddContentDialogOpen } = useDialog();

  const navItems = [
    { key: 'home', label: 'Home', icon: Home, href: '/dashboard' },
    { key: 'zones', label: 'Zones', icon: Bookmark, sheet: 'zones' },
    { key: 'fab', isFab: true },
    { key: 'todos', label: 'TODOs', icon: ListChecks, sheet: 'todos' },
    { key: 'types', label: 'Types', icon: ClipboardList, sheet: 'types' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="grid h-16 grid-cols-5 items-center justify-center">
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <div key="fab" className="flex justify-center">
                <Button
                  size="icon"
                  className="rounded-full h-16 w-16 shadow-lg -mt-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                  aria-label="Add Content"
                  onClick={() => setIsAddContentDialogOpen(true)}
                >
                  <PlusCircle className="h-8 w-8" />
                </Button>
              </div>
            );
          }

          const isActive = 'href' in item && pathname === item.href;

          if ('href' in item) {
            return (
              <Link key={item.key} href={item.href!} legacyBehavior>
                <a className={cn(
                  "flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors",
                  isActive ? "text-primary" : "hover:text-primary"
                )}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </a>
              </Link>
            );
          }
          
          if ('sheet' in item) {
            return (
              <button
                key={item.key}
                onClick={() => onNavClick(item.sheet as 'zones' | 'tags' | 'types' | 'todos')}
                className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            )
          }

          return null;
        })}
      </div>
    </nav>
  );
}
