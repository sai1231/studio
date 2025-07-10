
'use client';
import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserCircle, Settings, LogOut, Search, Bookmark, X, Tag, Globe, ClipboardList, ListFilter } from 'lucide-react';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

const AppHeader: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const auth = getAuth();
  const { availableZones, availableTags, availableContentTypes, search, isInitialized } = useSearch();

  const query = searchParams.get('q') || '';
  const zoneId = searchParams.get('zone') || '';
  const tagName = searchParams.get('tag') || '';
  const domainName = searchParams.get('domain') || '';
  const typeName = searchParams.get('type') || '';

  const activeFilter = useMemo(() => {
    if (zoneId) return { type: 'zone', value: availableZones.find(z => z.id === zoneId)?.name || zoneId };
    if (tagName) return { type: 'tag', value: tagName };
    if (domainName) return { type: 'domain', value: domainName };
    if (typeName) return { type: 'type', value: typeName };
    return null;
  }, [zoneId, tagName, domainName, typeName, availableZones]);

  const [inputValue, setInputValue] = useState(query);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // State for pending filters
  const [pendingZoneId, setPendingZoneId] = useState(zoneId);
  const [pendingTagNames, setPendingTagNames] = useState<string[]>(tagName ? tagName.split(',') : []);
  const [pendingContentType, setPendingContentType] = useState(typeName);
  
  useEffect(() => {
    if (isFilterOpen) {
      setPendingZoneId(searchParams.get('zone') || 'all');
      setPendingTagNames(searchParams.has('tag') ? searchParams.get('tag')!.split(',') : []);
      setPendingContentType(searchParams.get('type') || 'all');
    }
  }, [isFilterOpen, searchParams]);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    const handleSearch = () => {
        if (!isInitialized || pathname !== '/dashboard') return;
        const newParams = new URLSearchParams(searchParams.toString());

        if (inputValue.trim()) newParams.set('q', inputValue.trim());
        else newParams.delete('q');

        router.push(`/dashboard?${newParams.toString()}`);
    };

    const debounceTimer = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [inputValue, isInitialized, pathname, router, searchParams]);

  const handleFilterSelect = (type: 'zone' | 'tag' | 'domain' | 'type', value: string) => {
    const newParams = new URLSearchParams();
    if (query) newParams.set('q', query);
    newParams.set(type, value);
    router.push(`/dashboard?${newParams.toString()}`);
    setIsCommandOpen(false);
    setInputValue('');
  };

  const handleApplyFilters = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    // Update zone
    if (pendingZoneId && pendingZoneId !== 'all') newParams.set('zone', pendingZoneId);
    else newParams.delete('zone');

    // Update tags
    if (pendingTagNames.length > 0) newParams.set('tag', pendingTagNames.join(','));
    else newParams.delete('tag');

    // Update content type
    if (pendingContentType && pendingContentType !== 'all') newParams.set('type', pendingContentType);
    else newParams.delete('type');

    router.push(`/dashboard?${newParams.toString()}`);
    setIsFilterOpen(false);
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
  
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchParams.get('zone')) count++;
    if (searchParams.get('type')) count++;
    if (searchParams.get('tag')) count += searchParams.get('tag')!.split(',').length;
    return count;
  }, [searchParams]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <div className="flex-1">
        <div className="relative flex h-10 w-full items-center gap-2">
          <Command className="w-full rounded-lg border bg-muted" onKeyDown={(e) => {
              if (e.key === 'Escape') {
                  (e.target as HTMLElement).blur();
              }
          }}>
            <div className="flex items-center w-full px-2.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
              <CommandInput
                value={inputValue}
                onValueChange={(search) => {
                  setInputValue(search);
                  if (search.length > 1) setIsCommandOpen(true);
                  else setIsCommandOpen(false);
                }}
                onBlur={() => setIsCommandOpen(false)}
                onFocus={() => { if (inputValue.length > 1) setIsCommandOpen(true); }}
                placeholder="Type to search..."
                className="h-full w-full border-0 bg-transparent pl-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 relative">
                    <ListFilter className="h-4 w-4" />
                     {activeFilterCount > 0 && (
                       <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                         {activeFilterCount}
                       </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                   <div className="space-y-4">
                      <h4 className="font-medium leading-none">Filters</h4>
                      <div className="space-y-2">
                        <Label htmlFor="zone-filter">Zone</Label>
                        <Select value={pendingZoneId} onValueChange={setPendingZoneId}>
                          <SelectTrigger id="zone-filter"><SelectValue placeholder="All Zones" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Zones</SelectItem>
                            {availableZones.map(zone => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content-type-filter">Content Type</Label>
                        <Select value={pendingContentType} onValueChange={setPendingContentType}>
                          <SelectTrigger id="content-type-filter"><SelectValue placeholder="All Types" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {availableContentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tags</Label>
                        <ScrollArea className="h-40 rounded-md border p-2">
                          {availableTags.map(tag => (
                            <div key={tag.name} className="flex items-center space-x-2 p-1">
                              <Checkbox
                                id={`tag-${tag.name}`}
                                checked={pendingTagNames.includes(tag.name)}
                                onCheckedChange={(checked) => {
                                  setPendingTagNames(prev => checked ? [...prev, tag.name] : prev.filter(t => t !== tag.name));
                                }}
                              />
                              <Label htmlFor={`tag-${tag.name}`} className="text-sm font-normal">{tag.name}</Label>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                      <Button onClick={handleApplyFilters} className="w-full">Apply Filters</Button>
                   </div>
                </PopoverContent>
              </Popover>
            </div>
            {isCommandOpen && (
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                  {availableZones.filter(z => z.name.toLowerCase().includes(inputValue.toLowerCase())).map(zone => (
                    <CommandItem key={zone.id} onSelect={() => handleFilterSelect('zone', zone.id)}>
                      <Bookmark className="mr-2 h-4 w-4" />
                      <span>{zone.name}</span>
                    </CommandItem>
                  ))}
                  {availableTags.filter(t => t.name.toLowerCase().includes(inputValue.toLowerCase())).map(tag => (
                    <CommandItem key={tag.name} onSelect={() => handleFilterSelect('tag', tag.name)}>
                      <Tag className="mr-2 h-4 w-4" />
                      <span>{tag.name}</span>
                    </CommandItem>
                  ))}
                  {availableContentTypes.filter(c => c.toLowerCase().includes(inputValue.toLowerCase())).map(type => (
                    <CommandItem key={type} onSelect={() => handleFilterSelect('type', type)}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      <span>{type}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            )}
          </Command>
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
