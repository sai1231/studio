
'use client';
import type React from 'react';
import { useState, useEffect } from 'react';
import { Home, Tag, Settings, LogOut, Users, ChevronDown, Plus, Globe, ClipboardList, Bookmark, Newspaper, Film, Baseline, Github, MessageSquare, MessagesSquare, BookOpen, LucideIcon, StickyNote, Briefcase, Library, FileText, Sparkles, Layers } from 'lucide-react'; // Added Layers
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import MatiLogo from './mati-logo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Zone, Tag as TagType } from '@/types';
import { ThemeToggle } from './theme-toggle';
import { Separator } from '@/components/ui/separator';
import { getZones, subscribeToContentItems, getUniqueDomainsFromItems, getUniqueContentTypesFromItems, getUniqueTagsFromItems } from '@/services/contentService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getAuth, signOut } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';

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
  const router = useRouter();
  const auth = getAuth();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Fetch zones once, as they don't depend on content items directly for updates.
    const fetchInitialZones = async () => {
        try {
            const fetchedZones = await getZones(user.uid);
            setZones(fetchedZones);
        } catch (error) {
            console.error("Error fetching zones for sidebar:", error);
            toast({ title: "Error", description: "Could not load zones.", variant: "destructive" });
        }
    };
    fetchInitialZones();

    // Subscribe to content items for real-time updates to domains, tags, and content types.
    const unsubscribe = subscribeToContentItems(user.uid, (items, error) => {
        if (error) {
            console.error("Error subscribing to content items in sidebar:", error);
            toast({ title: "Real-time Error", description: "Could not update sidebar content.", variant: "destructive" });
            return;
        }

        const fetchedDomains = getUniqueDomainsFromItems(items);
        const fetchedContentTypes = getUniqueContentTypesFromItems(items);
        const fetchedTags = getUniqueTagsFromItems(items);
        
        setDomains(fetchedDomains);
        setActualTags(fetchedTags);

        const availablePredefinedTypes = fetchedContentTypes.filter(
            type => predefinedContentTypes[type]
        );
        setContentTypes(availablePredefinedTypes);
    });

    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, [user, toast]);


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

  const formatDomainName = (domain: string): string => {
    const nameWithoutTld = domain.replace(/\.(com|net|org|io|dev|co|ai|app|me|xyz|info|biz|blog|tech|co\.uk|org\.uk|ac\.uk|gov\.uk)$/i, '');
    return nameWithoutTld.charAt(0).toUpperCase() + nameWithoutTld.slice(1);
  };


  return (
    <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:block w-64 fixed top-0 left-0 h-full z-20">
      <div className="flex h-full max-h-screen flex-col">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <MatiLogo />
        </div>

        <ScrollArea className="flex-1 py-2 px-4">
          <nav className="grid items-start gap-1 text-sm font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-primary aria-[current=page]:text-sidebar-primary-foreground"
            >
              <Home className="h-4 w-4" />
              All Memories
            </Link>

            <Link
              href="/declutter"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-primary aria-[current=page]:text-sidebar-primary-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Declutter
            </Link>

            <Accordion type="multiple" defaultValue={['zones']} className="w-full">
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
                      key={tag.name} 
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
                    <Link
                      key={domain}
                      href={`/domains/${encodeURIComponent(domain)}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-primary/80 aria-[current=page]:text-sidebar-primary-foreground"
                    >
                       <Globe className="h-4 w-4 opacity-70" />
                       {formatDomainName(domain)}
                    </Link>
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
                      <Link
                        key={contentTypeKey}
                        href={`/content-types/${encodeURIComponent(contentTypeKey)}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-primary/80 aria-[current=page]:text-sidebar-primary-foreground"
                      >
                        <IconComponent className="h-4 w-4 opacity-70" />
                        {typeDetails.name}
                      </Link>
                    );
                  })}
                  {contentTypes.length === 0 && <p className="px-3 py-2 text-xs text-sidebar-foreground/60">No matching content types found.</p>}
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-primary aria-[current=page]:text-sidebar-primary-foreground"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </ScrollArea>
        
        <div className="p-4">
            <ThemeToggle />
        </div>
        <div className="p-4 border-t border-sidebar-border">
           <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
             <LogOut className="h-4 w-4 mr-2" />
             Logout
           </Button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
