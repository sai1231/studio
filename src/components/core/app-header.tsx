
'use client';
import type React from 'react';
import { Search, PlusCircle, Bell, UserCircle, Settings, LogOut, Link as LinkIcon, ImageIcon, ListTodo, Mic } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';


interface AppHeaderProps {
  onAddLinkClick: () => void;
  onSearchChange?: (query: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onAddLinkClick, onSearchChange }) => {
  const { toast } = useToast();

  const handleAddImage = () => {
    toast({ title: "Add Image", description: "Functionality to add images is not yet implemented." });
  };

  const handleAddTodo = () => {
    toast({ title: "Add To-Do", description: "Functionality to add to-do items is not yet implemented." });
  };

  const handleAddVoiceRecording = () => {
    toast({ title: "Record Voice", description: "Functionality to record voice is not yet implemented." });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 shadow-sm">
      <KlippedLogo className="hidden md:flex" />
      
      <div className="flex-1 relative ml-auto md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search links..."
          className="w-full rounded-lg bg-muted pl-8 md:w-[200px] lg:w-[320px] focus-visible:ring-accent"
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Create New</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onAddLinkClick}>
            <LinkIcon className="mr-2 h-4 w-4" />
            <span>URL / Link</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddImage}>
            <ImageIcon className="mr-2 h-4 w-4" />
            <span>Image</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddTodo}>
            <ListTodo className="mr-2 h-4 w-4" />
            <span>To-Do</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAddVoiceRecording}>
            <Mic className="mr-2 h-4 w-4" />
            <span>Voice Recording</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="user avatar" />
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
