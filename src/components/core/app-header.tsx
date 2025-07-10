

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
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useSearch } from '@/context/SearchContext';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getUniqueContentTypesFromItems, getUniqueTagsFromItems, getUniqueDomainsFromItems } from '@/services/contentService';


const AppHeader: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const auth = getAuth();
  const { allItems, availableZones, search } = useSearch();

  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // State for pending filters in the popover
  const [pendingZoneId, setPendingZoneId] = useState<string | undefined>(undefined);
  const [pendingTagNames, setPendingTagNames] = useState<string[]>([]);
  const [pendingContentType, setPendingContentType] = useState<string | undefined>(undefined);
  const [pendingDomain, setPendingDomain] = useState<string | undefined>(undefined);
  
  // Set initial pending filters when popover opens
  useEffect(() => {
    if (isFilterOpen) {
      setPendingZoneId(searchParams.get('zone') || undefined);
      setPendingTagNames(searchParams.has('tag') ? searchParams.get('tag')!.split(',') : []);
      setPendingContentType(searchParams.get('type') || undefined);
      setPendingDomain(searchParams.get('domain') || undefined);
    }
  }, [isFilterOpen, searchParams]);

  const { popoverTags, popoverContentTypes, popoverDomains, popoverZones } = useMemo(() => {
    if (!isFilterOpen) return { popoverTags: [], popoverContentTypes: [], popoverDomains: [], popoverZones: [] };
  
    // Filter items based on pending selections for ContentType, Tags, and Domain
    let itemsForZoneFilter = allItems;
    if (pendingContentType) itemsForZoneFilter = itemsForZoneFilter.filter(item => item.contentType === pendingContentType);
    if (pendingTagNames.length > 0) itemsForZoneFilter = itemsForZoneFilter.filter(item => pendingTagNames.every(tagName => item.tags.some(t => t.name === tagName)));
    if (pendingDomain) itemsForZoneFilter = itemsForZoneFilter.filter(item => item.domain === pendingDomain);
    const availableZoneIds = new Set(itemsForZoneFilter.map(item => item.zoneId).filter(Boolean));
    const finalPopoverZones = availableZones.filter(zone => availableZoneIds.has(zone.id));
  
    // Filter items based on pending selections for Zone, Tags, and Domain
    let itemsForContentTypeFilter = allItems;
    if (pendingZoneId) itemsForContentTypeFilter = itemsForContentTypeFilter.filter(item => item.zoneId === pendingZoneId);
    if (pendingTagNames.length > 0) itemsForContentTypeFilter = itemsForContentTypeFilter.filter(item => pendingTagNames.every(tagName => item.tags.some(t => t.name === tagName)));
    if (pendingDomain) itemsForContentTypeFilter = itemsForContentTypeFilter.filter(item => item.domain === pendingDomain);
    const finalPopoverContentTypes = getUniqueContentTypesFromItems(itemsForContentTypeFilter);
  
    // Filter items based on pending selections for Zone, ContentType, and Domain
    let itemsForTagFilter = allItems;
    if (pendingZoneId) itemsForTagFilter = itemsForTagFilter.filter(item => item.zoneId === pendingZoneId);
    if (pendingContentType) itemsForTagFilter = itemsForTagFilter.filter(item => item.contentType === pendingContentType);
    if (pendingDomain) itemsForTagFilter = itemsForTagFilter.filter(item => item.domain === pendingDomain);
    const finalPopoverTags = getUniqueTagsFromItems(itemsForTagFilter);
  
     // Filter items based on pending selections for Zone, ContentType, and Tags
    let itemsForDomainFilter = allItems;
    if (pendingZoneId) itemsForDomainFilter = itemsForDomainFilter.filter(item => item.zoneId === pendingZoneId);
    if (pendingContentType) itemsForDomainFilter = itemsForDomainFilter.filter(item => item.contentType === pendingContentType);
    if (pendingTagNames.length > 0) itemsForDomainFilter = itemsForDomainFilter.filter(item => pendingTagNames.every(tagName => item.tags.some(t => t.name === tagName)));
    const finalPopoverDomains = getUniqueDomainsFromItems(itemsForDomainFilter);

    return { 
      popoverZones: finalPopoverZones,
      popoverContentTypes: finalPopoverContentTypes,
      popoverTags: finalPopoverTags,
      popoverDomains: finalPopoverDomains,
    };
  }, [isFilterOpen, allItems, availableZones, pendingZoneId, pendingContentType, pendingTagNames, pendingDomain]);


  const handleSearchInputChange = (search: string) => {
    setInputValue(search);
    if (search.length > 1) setIsCommandOpen(true);
    else setIsCommandOpen(false);
  };
  
  const handleFilterSelect = (type: 'zone' | 'tag' | 'domain' | 'type', value: string) => {
    const newParams = new URLSearchParams();
    if(inputValue) newParams.set('q', inputValue);
    newParams.set(type, value);
    router.push(`/dashboard?${newParams.toString()}`);
    setIsCommandOpen(false);
  };

  const handleApplyFilters = () => {
    const newParams = new URLSearchParams();
    if (inputValue) newParams.set('q', inputValue);

    if (pendingZoneId) newParams.set('zone', pendingZoneId);
    if (pendingTagNames.length > 0) newParams.set('tag', pendingTagNames.join(','));
    if (pendingContentType) newParams.set('type', pendingContentType);
    if (pendingDomain) newParams.set('domain', pendingDomain);

    router.push(`/dashboard?${newParams.toString()}`);
    setIsFilterOpen(false);
  };
  
  const handleClearFilters = () => {
    setPendingZoneId(undefined);
    setPendingTagNames([]);
    setPendingContentType(undefined);
    setPendingDomain(undefined);
    
    const newParams = new URLSearchParams();
    if (inputValue) newParams.set('q', inputValue);
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
    if (searchParams.get('domain')) count++;
    if (searchParams.get('tag')) count += searchParams.get('tag')!.split(',').length;
    return count;
  }, [searchParams]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <div className="flex-1 flex items-center gap-2">
        <Command className="relative w-full rounded-lg border bg-muted" onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLElement).blur();
        }}>
          <div className="flex items-center w-full px-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
            <CommandInput
              value={inputValue}
              onValueChange={handleSearchInputChange}
              onBlur={() => setTimeout(() => setIsCommandOpen(false), 150)}
              onFocus={() => { if (inputValue.length > 1) setIsCommandOpen(true); }}
              placeholder="Search or filter..."
              className="h-9 w-full border-0 bg-transparent pl-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          {isCommandOpen && (
            <CommandList className="absolute top-full mt-1 w-full rounded-md border bg-popover shadow-lg z-50">
              <CommandEmpty>No results found.</CommandEmpty>
              {availableZones.filter(z => z.name.toLowerCase().includes(inputValue.toLowerCase())).length > 0 && (
                <CommandGroup heading="Zones">
                  {availableZones.filter(z => z.name.toLowerCase().includes(inputValue.toLowerCase())).map(zone => (
                    <CommandItem key={zone.id} onSelect={() => handleFilterSelect('zone', zone.id)}>
                      <Bookmark className="mr-2 h-4 w-4" />
                      <span>{zone.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
               {popoverTags.filter(t => t.name.toLowerCase().includes(inputValue.toLowerCase())).length > 0 && (
                <CommandGroup heading="Tags">
                  {popoverTags.filter(t => t.name.toLowerCase().includes(inputValue.toLowerCase())).map(tag => (
                    <CommandItem key={tag.name} onSelect={() => handleFilterSelect('tag', tag.name)}>
                      <Tag className="mr-2 h-4 w-4" />
                      <span>{tag.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
               )}
                {popoverDomains.filter(d => d.toLowerCase().includes(inputValue.toLowerCase())).length > 0 && (
                 <CommandGroup heading="Domains">
                    {popoverDomains.filter(d => d.toLowerCase().includes(inputValue.toLowerCase())).map(domain => (
                         <CommandItem key={domain} onSelect={() => handleFilterSelect('domain', domain)}>
                           <Globe className="mr-2 h-4 w-4" />
                           <span>{domain}</span>
                         </CommandItem>
                       ))}
                 </CommandGroup>
                )}
                {popoverContentTypes.filter(c => c.toLowerCase().includes(inputValue.toLowerCase())).length > 0 && (
                  <CommandGroup heading="Content Types">
                    {popoverContentTypes.filter(c => c.toLowerCase().includes(inputValue.toLowerCase())).map(type => (
                      <CommandItem key={type} onSelect={() => handleFilterSelect('type', type)}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        <span>{type}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
            </CommandList>
          )}
        </Command>

        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="shrink-0 relative">
              <ListFilter className="h-4 w-4 mr-2" />
              Filter
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
                  <Select value={pendingZoneId || 'all'} onValueChange={(val) => setPendingZoneId(val === 'all' ? undefined : val)}>
                    <SelectTrigger id="zone-filter"><SelectValue placeholder="All Zones" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Zones</SelectItem>
                      {popoverZones.map(zone => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content-type-filter">Content Type</Label>
                  <Select value={pendingContentType || 'all'} onValueChange={(val) => setPendingContentType(val === 'all' ? undefined : val)}>
                    <SelectTrigger id="content-type-filter"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {popoverContentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2">
                  <Label>Tags</Label>
                  <ScrollArea className="h-40 rounded-md border p-2">
                    {popoverTags.map(tag => (
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
                <div className="flex justify-between items-center">
                    <Button variant="ghost" onClick={handleClearFilters} className="text-destructive hover:text-destructive">Clear</Button>
                    <Button onClick={handleApplyFilters} className="w-fit">Apply Filters</Button>
                </div>
              </div>
          </PopoverContent>
        </Popover>
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

