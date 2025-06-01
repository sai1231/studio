
'use client';
import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Home, Tag, Settings, LogOut, Users, ChevronDown, Plus, Globe, ClipboardList, Bookmark, Newspaper, Film, Baseline, Github, MessageSquare, MessagesSquare, BookOpen, LucideIcon, StickyNote, Briefcase, Library, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import KlippedLogo from './klipped-logo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Zone, Tag as TagType } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from './theme-toggle';
import { Separator } from '@/components/ui/separator';
import { getZones, getUniqueDomains, getUniqueContentTypes, getUniqueTags } from '@/services/contentService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


const predefinedContentTypes: Record<string, { icon: LucideIcon, name: string }> = {
  Post: { icon: Newspaper, name: 'Post' },
  Reel: { icon: Film, name: 'Reel' },
  Note: { icon: StickyNote, name: 'Note' },
  Repositories: { icon: Github, name: 'Repositories' },
  Tweet: { icon: MessageSquare, name: 'Tweet' },
  Thread: { icon: MessagesSquare, name: 'Thread' },
  Article: { icon: BookOpen, name: 'Article' },
  PDF: { icon: FileText, name: 'PDF' },
};

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase,
  Home,
  Library,
  Bookmark,
};


const AppSidebar: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [actualTags, setActualTags] = useState<TagType[]>([]);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [fetchedZones, fetchedDomains, fetchedContentTypes, fetchedTags] = await Promise.all([
        getZones(),
        getUniqueDomains(),
        getUniqueContentTypes(),
        getUniqueTags(),
      ]);
      setZones(fetchedZones);
      setDomains(fetchedDomains);
      setActualTags(fetchedTags);

      // Filter fetchedContentTypes to only include those in predefinedContentTypes
      const availablePredefinedTypes = fetchedContentTypes.filter(
        type => predefinedContentTypes[type]
      );
      setContentTypes(availablePredefinedTypes);

    } catch (error) {
      console.error("Error fetching sidebar data:", error);
      toast({ title: "Error", description: "Could not load sidebar categories.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDomainName = (domain: string): string => {
    const nameWithoutTld = domain.replace(/\.(com|net|org|io|dev|co|ai|app|me|xyz|info|biz|blog|tech|co\.uk|org\.uk|ac\.uk|gov\.uk)$/i, '');
    return nameWithoutTld.charAt(0).toUpperCase() + nameWithoutTld.slice(1);
  };


  return (
    <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:block w-64 fixed top-0 left-0 h-full z-20">
      <div className="flex h-full max-h-screen flex-col">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <KlippedLogo />
        </div>

        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-sidebar-foreground">Samantha</p>
              <p className="text-xs text-sidebar-foreground/70">samantha@email.com</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 py-2 px-4">
          <nav className="grid items-start gap-1 text-sm font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-primary aria-[current=page]:text-sidebar-primary-foreground"
            >
              <Home className="h-4 w-4" />
              All Content
            </Link>

            <Accordion type="multiple" defaultValue={['zones', 'tags', 'domains', 'contentTypes']} className="w-full">
              <AccordionItem value="zones" className="border-b-0">
                <AccordionTrigger className="px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Bookmark className="h-4 w-4" />
                    Zones
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 mt-1 space-y-1">
                  {zones.map((zone) => {
                    const IconComponent = zone.icon && iconMap[zone.icon] ? iconMap[zone.icon] : Bookmark;
                    const isDefaultIcon = !zone.icon || !iconMap[zone.icon];
                    return (
                      <Link
                        key={zone.id}
                        href={`/zones/${zone.id}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-primary/80 aria-[current=page]:text-sidebar-primary-foreground"
                      >
                        <IconComponent className={cn("h-4 w-4", isDefaultIcon && "opacity-50")} />
                        {zone.name}
                      </Link>
                    );
                  })}
                  <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80 mt-1 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground">
                    <Plus className="h-4 w-4 mr-2" /> Add Zone
                  </Button>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tags" className="border-b-0">
                <AccordionTrigger className="px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4" />
                    Tags
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 mt-1 space-y-1">
                  {actualTags.length > 0 ? actualTags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tags/${encodeURIComponent(tag.name)}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-primary/80 aria-[current=page]:text-sidebar-primary-foreground"
                    >
                       # {tag.name}
                    </Link>
                  )) : (
                    <p className="px-3 py-2 text-xs text-sidebar-foreground/60">No tags found.</p>
                  )}
                   <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80 mt-1 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground">
                    <Plus className="h-4 w-4 mr-2" /> Manage Tags
                  </Button>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="domains" className="border-b-0">
                <AccordionTrigger className="px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4" />
                    Domains
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 mt-1 space-y-1">
                  {domains.map((domain) => (
                    <div key={domain} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80">
                       <Globe className="h-4 w-4 opacity-70" />
                       {formatDomainName(domain)}
                    </div>
                  ))}
                  {domains.length === 0 && <p className="px-3 py-2 text-xs text-sidebar-foreground/60">No domains found.</p>}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contentTypes" className="border-b-0">
                <AccordionTrigger className="px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg hover:no-underline">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-4 w-4" />
                    Content Types
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 mt-1 space-y-1">
                  {contentTypes.map((contentTypeKey) => {
                    const typeDetails = predefinedContentTypes[contentTypeKey];
                    if (!typeDetails) return null;
                    const IconComponent = typeDetails.icon;
                    return (
                      <div key={contentTypeKey} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80">
                        <IconComponent className="h-4 w-4 opacity-70" />
                        {typeDetails.name}
                      </div>
                    );
                  })}
                  {contentTypes.length === 0 && <p className="px-3 py-2 text-xs text-sidebar-foreground/60">No matching content types found.</p>}
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </ScrollArea>
        <Separator className="bg-sidebar-border my-2" />
        <div className="p-4">
            <ThemeToggle />
        </div>
        <div className="p-4 border-t border-sidebar-border">
           <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
             <LogOut className="h-4 w-4 mr-2" />
             Logout
           </Button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
