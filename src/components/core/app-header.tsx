
'use client';
import type React from 'react';
import { Search, PlusCircle, UploadCloud, Mic } from 'lucide-react';
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
  onImageFileSelected: (file: File) => void;
  onRecordVoiceClick: () => void;
  onSearchChange?: (query: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  onAddContentClick, 
  onImageFileSelected,
  onRecordVoiceClick,
  onSearchChange 
}) => {

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageFileSelected(file);
      event.target.value = ''; // Reset file input
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 shadow-sm">
      <KlippedLogo className="hidden md:flex" />
      
      <div className="flex-1 relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search content..."
          className="w-full rounded-lg bg-muted pl-8 focus-visible:ring-accent"
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button 
          size="icon"
          variant="ghost"
          onClick={onAddContentClick}
          aria-label="Add content"
        >
          <PlusCircle className="h-5 w-5" />
        </Button>

        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => document.getElementById('imageUploadInput')?.click()}
          aria-label="Upload image"
        >
          <UploadCloud className="h-5 w-5" />
        </Button>
        <input 
          type="file" 
          id="imageUploadInput" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileSelect} 
        />

        <Button 
          size="icon" 
          variant="ghost" 
          onClick={onRecordVoiceClick}
          aria-label="Record voice"
        >
          <Mic className="h-5 w-5" />
        </Button>
      </div>

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
