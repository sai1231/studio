
'use client';
import type React from 'react';
import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserCircle, Settings, LogOut, Search, Bookmark, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useSearch } from '@/context/SearchContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const AppHeader: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const auth = getAuth();
  const { availableZones } = useSearch();

  const query = searchParams.get('q') || '';
  const zoneId = searchParams.get('zone') || '';
  const selectedZone = zoneId ? availableZones.find(z => z.id === zoneId) : null;
  
  const [inputValue, setInputValue] = useState(query);

  // Effect to update the input's value if the URL query changes
  useEffect(() => {
    setInputValue(searchParams.get('q') || '');
  }, [searchParams]);

  // Debounced effect to update the URL with the search query as the user types
  useEffect(() => {
    // Only perform search navigation if we are on the dashboard
    if (pathname !== '/dashboard') {
      return;
    }

    const debounceTimer = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams.toString());
      
      if (!inputValue.trim()) {
        newParams.delete('q');
      } else {
        newParams.set('q', inputValue.trim());
      }
      
      router.push(`/dashboard?${newParams.toString()}`);
     
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [inputValue, router, searchParams, pathname]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const handleZoneSelect = (newZoneId: string | null) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (newZoneId) {
        newParams.set('zone', newZoneId);
    } else {
        newParams.delete('zone');
    }
    router.push(`/dashboard?${newParams.toString()}`);
  };
  
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

  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <div className="flex-1">
        <div className="relative flex h-10 w-full items-center gap-2 rounded-lg bg-muted px-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          {selectedZone && (
            <Badge variant="secondary" className="h-6 shrink-0 pl-2 pr-1">
              <Bookmark className="mr-1 h-3 w-3" />
              {selectedZone.name}
              <button onClick={() => handleZoneSelect(null)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <Input
              type="search"
              placeholder="Search my memories..."
              className="h-full w-full border-0 bg-transparent pl-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </form>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User Avatar'} data-ai-hint="user avatar" />
                <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.displayName || user?.email || 'My Account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/profile">
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppHeader;
