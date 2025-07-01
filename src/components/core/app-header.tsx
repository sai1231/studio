
'use client';
import type React from 'react';
import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserCircle, Settings, LogOut, Search } from 'lucide-react';
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

const AppHeader: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const auth = getAuth();
  
  // Local state for the input field to allow for debouncing
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');

  // Effect to update the input's value if the URL query changes (e.g., from browser back/forward)
  useEffect(() => {
    setInputValue(searchParams.get('q') || '');
  }, [searchParams]);

  // Effect to debounce user input and update the URL
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      // Don't do anything if the user is not on the search page and the input is empty
      if (pathname !== '/search' && !inputValue) {
        return;
      }
      
      const newParams = new URLSearchParams(searchParams.toString());
      
      if (!inputValue.trim()) {
        newParams.delete('q');
      } else {
        newParams.set('q', inputValue.trim());
      }
      
      // Navigate to the search page with the new query.
      // `router.push` is smart enough to not cause a full page reload if only search params change.
      router.push(`/search?${newParams.toString()}`);
     
    }, 300); // 300ms delay

    return () => clearTimeout(debounceTimer);
  }, [inputValue, pathname, router, searchParams]);


  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // The debounced effect handles the logic, so we just prevent default form submission.
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="flex-1">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search my memories..."
                className="w-full rounded-lg bg-muted pl-9"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
            />
        </form>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User Avatar'} data-ai-hint="user avatar"/>
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
    </header>
  );
};

export default AppHeader;
