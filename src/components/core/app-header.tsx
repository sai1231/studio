
'use client';
import type React from 'react';
import { Search, PlusCircle, UploadCloud, Mic } from 'lucide-react'; // Added Mic
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
import { UserCircle, Settings, LogOut } from 'lucide-react'; // Keep existing imports

interface AppHeaderProps {
  onAddContentClick: () => void;
  onSearchChange?: (query: string) => void;
  onImageFileSelected: (file: File) => void;
  onRecordVoiceClick: () => void; // New prop for voice recording
}

const AppHeader: React.FC<AppHeaderProps> = ({ onAddContentClick, onSearchChange, onImageFileSelected, onRecordVoiceClick }) => {
  const handleImageUploadInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageFileSelected(event.target.files[0]);
      event.target.value = ''; // Reset input to allow selecting the same file again
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 shadow-sm">
      <KlippedLogo className="hidden md:flex" />
      
      <div className="flex-1 relative ml-auto md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search content..."
          className="w-full rounded-lg bg-muted pl-8 md:w-[200px] lg:w-[320px] focus-visible:ring-accent"
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>

      <Button 
        size="sm" 
        variant="default" 
        onClick={onAddContentClick}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <PlusCircle className="h-4 w-4 mr-0 sm:mr-2" />
        <span className="hidden sm:inline">Add</span>
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={() => document.getElementById('directImageUploadInput')?.click()}
        aria-label="Upload Image"
      >
        <UploadCloud className="h-4 w-4 mr-0 sm:mr-2" />
        <span className="hidden sm:inline">Image</span>
      </Button>
      <input
        type="file"
        id="directImageUploadInput"
        className="hidden"
        accept="image/*"
        onChange={handleImageUploadInputChange}
      />

      <Button
        size="sm"
        variant="outline"
        onClick={onRecordVoiceClick}
        aria-label="Record Voice"
      >
        <Mic className="h-4 w-4 mr-0 sm:mr-2" />
        <span className="hidden sm:inline">Voice</span>
      </Button>

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
