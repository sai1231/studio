
'use client';
import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, UserCircle, Settings, LogOut, ListFilter, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { getZones, getContentItems, getUniqueContentTypesFromItems, getUniqueTagsFromItems } from '@/services/contentService';
import type { Zone, Tag as AppTag } from '@/types';
import { cn } from '@/lib/utils';

const ALL_FILTER_VALUE = "__ALL__";

const AppHeader: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const auth = getAuth();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<AppTag[]>([]);

  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [pendingZoneId, setPendingZoneId] = useState(searchParams.get('zoneId') || ALL_FILTER_VALUE);
  const [pendingContentType, setPendingContentType] = useState(searchParams.get('contentType') || ALL_FILTER_VALUE);
  const [pendingTags, setPendingTags] = useState(searchParams.get('tags')?.split(',') || []);
  
  useEffect(() => {
    if (user) {
      const fetchFilterData = async () => {
        try {
            const [zones, items] = await Promise.all([
                getZones(user.uid),
                getContentItems(user.uid)
            ]);
            setAvailableZones(zones);
            setAvailableContentTypes(getUniqueContentTypesFromItems(items));
            setAvailableTags(getUniqueTagsFromItems(items));
        } catch (error) {
            console.error("Error fetching filter data for header:", error);
            toast({ title: "Error", description: "Could not load filter options." });
        }
      };
      fetchFilterData();
    }
  }, [user, toast]);

  useEffect(() => {
    if (isFilterPopoverOpen) {
      setPendingZoneId(searchParams.get('zoneId') || ALL_FILTER_VALUE);
      setPendingContentType(searchParams.get('contentType') || ALL_FILTER_VALUE);
      setPendingTags(searchParams.get('tags')?.split(',').filter(Boolean) || []);
    }
  }, [isFilterPopoverOpen, searchParams]);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const executeSearch = (filters: { zoneId?: string; contentType?: string; tags?: string[] }) => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (filters.zoneId && filters.zoneId !== ALL_FILTER_VALUE) params.set('zoneId', filters.zoneId);
    if (filters.contentType && filters.contentType !== ALL_FILTER_VALUE) params.set('contentType', filters.contentType);
    if (filters.tags && filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    
    router.push(`/search?${params.toString()}`);
    setIsFilterPopoverOpen(false);
  };
  
  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentZoneId = searchParams.get('zoneId') || undefined;
    const currentContentType = searchParams.get('contentType') || undefined;
    const currentTags = searchParams.get('tags')?.split(',') || undefined;
    executeSearch({ zoneId: currentZoneId, contentType: currentContentType, tags: currentTags });
  };
  
  const handleApplyFilters = () => {
    executeSearch({ zoneId: pendingZoneId, contentType: pendingContentType, tags: pendingTags });
  };

  const handleClearFilters = () => {
    setPendingZoneId(ALL_FILTER_VALUE);
    setPendingContentType(ALL_FILTER_VALUE);
    setPendingTags([]);
    executeSearch({});
  };
  
  const handleTagSelectionChange = (tagName: string, checked: boolean) => {
    setPendingTags(prev => 
      checked ? [...prev, tagName] : prev.filter(name => name !== tagName)
    );
  };
  
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchParams.get('zoneId')) count++;
    if (searchParams.get('contentType')) count++;
    if (searchParams.get('tags')) count++;
    return count;
  }, [searchParams]);


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
    <header className="sticky top-0 z-30 flex h-24 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 shadow-sm">
      <form onSubmit={handleSearchFormSubmit} className="flex-1 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search all memories..."
          className="w-full rounded-lg bg-muted pl-12 pr-4 py-4 text-lg h-14 focus-visible:ring-accent"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
          <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-14 w-14 flex-shrink-0 relative">
                  <ListFilter className="h-5 w-5"/>
                  {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                          {activeFilterCount}
                      </span>
                  )}
              </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 space-y-4" align="end">
              <div className="space-y-1">
                  <Label htmlFor="zone-filter-header" className="text-sm font-medium">Zone</Label>
                  <Select value={pendingZoneId} onValueChange={setPendingZoneId}>
                      <SelectTrigger id="zone-filter-header">
                          <SelectValue placeholder="All Zones" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value={ALL_FILTER_VALUE}>All Zones</SelectItem>
                          {availableZones.map(zone => (
                              <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              <div className="space-y-1">
                  <Label htmlFor="content-type-filter-header" className="text-sm font-medium">Content Type</Label>
                  <Select value={pendingContentType} onValueChange={setPendingContentType}>
                      <SelectTrigger id="content-type-filter-header">
                          <SelectValue placeholder="All Content Types" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value={ALL_FILTER_VALUE}>All Content Types</SelectItem>
                          {availableContentTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                  <Label className="text-sm font-medium">Tags</Label>
                  {availableTags.length > 0 ? (
                      <ScrollArea className="h-32 rounded-md border p-2">
                          <div className="space-y-1.5">
                          {availableTags.map(tag => (
                              <div key={tag.id} className="flex items-center space-x-2">
                                  <Checkbox 
                                      id={`tag-header-${tag.id}`} 
                                      checked={pendingTags.includes(tag.name)}
                                      onCheckedChange={(checked) => handleTagSelectionChange(tag.name, !!checked)}
                                  />
                                  <Label htmlFor={`tag-header-${tag.id}`} className="text-sm font-normal cursor-pointer">{tag.name}</Label>
                              </div>
                          ))}
                          </div>
                      </ScrollArea>
                  ) : (
                      <p className="text-sm text-muted-foreground">No tags available.</p>
                  )}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <Button onClick={handleClearFilters} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <XCircle className="h-4 w-4 mr-2"/>
                      Clear Filters
                  </Button>
                  <Button onClick={handleApplyFilters} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Apply & Search
                  </Button>
              </div>
          </PopoverContent>
      </Popover>

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
