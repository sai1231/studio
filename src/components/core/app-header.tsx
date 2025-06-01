
'use client';
import type React from 'react';
import { Search, PlusCircle } from 'lucide-react'; // Removed UploadCloud, Mic
import { Input } from '@/components/ui/input';
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
import KlippedLogo from './klipped-logo';
import { UserCircle, Settings, LogOut } from 'lucide-react';

interface AppHeaderProps {
  onAddContentClick: () => void;
  onSearchChange?: (query: string) => void;
  // Removed onImageFileSelected and onRecordVoiceClick
}

const AppHeader: React.FC<AppHeaderProps> = ({ onAddContentClick, onSearchChange }) => {

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 shadow-sm">
      <KlippedLogo className="hidden md:flex" />
      
      <div className="flex-1 relative"> {/* Changed: ml-auto md:grow-0 to flex-1 */}
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search content..."
          className="w-full rounded-lg bg-muted pl-8 focus-visible:ring-accent" // Removed md:w-[200px] lg:w-[320px] to allow full width
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>

      <Button 
        size="sm" // Consider 'icon' size if that's preferred
        variant="default" 
        onClick={onAddContentClick}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        aria-label="Add content" // Added aria-label for accessibility
      >
        <PlusCircle className="h-4 w-4" /> {/* Removed mr-0 sm:mr-2 and span */}
      </Button>

      {/* Removed Image Upload Button */}
      {/* Removed Voice Record Button */}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="user avatar"/>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default AppHeader;
