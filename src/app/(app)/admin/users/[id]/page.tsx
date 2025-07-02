'use client';
import type React from 'react';
import { useState, useEffect } from 'react';
import { Home, Tag, LogOut, Globe, ClipboardList, Bookmark, Newspaper, Film, Github, MessagesSquare, BookOpen, LucideIcon, StickyNote, Sparkles, Shield, Brain } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { Zone, Tag as TagType } from '@/types';
import { ThemeToggle } from './theme-toggle';
import { subscribeToZones, subscribeToContentItems, getUniqueDomainsFromItems, getUniqueContentTypesFromItems, getUniqueTagsFromItems } from '@/services/contentService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getAuth, signOut } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';


const predefinedContentTypes: Record<string, { icon: LucideIcon, name: string }> = {
  Post: { icon: Newspaper, name: 'Post' },
  Reel: { icon: Film, name: 'Reel' },
  Note: { icon: StickyNote, name: 'Note' },
  Repositories: { icon: Github, name: 'Repositories' },
  Tweet: { icon: MessagesSquare, name: 'Tweet' },
  Thread: { icon: MessagesSquare, name: 'Thread' },
  Article: { icon: BookOpen, name: 'Article' },
  PDF: { icon: BookOpen, name: 'PDF' },
};

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase: StickyNote,
  Home: Home,
  Library: BookOpen,
  Bookmark: Bookmark,
};

const SidebarLink = ({ href, icon: Icon, children, ...props }: { href: string, icon: LucideIcon, children: React.ReactNode, [key: string]: any }) => (
  <Link href={href} className="flex flex-col items-center justify-center text-center gap-1 rounded-lg p-2 text-sidebar-foreground transition-all w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" {...props}>
    <Icon className="h-5 w-5" />
    <span className="text-[10px] font-medium leading-none">{children}</span>
  </Link>
);


const HoverNavButton = ({ icon: Icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) => (
    <HoverCard openDelay={100} closeDelay={100}>
        <HoverCardTrigger asChild>
            <Button
                variant="ghost"
                className="flex flex-col items-center justify-center text-center gap-1 rounded-lg p-2 text-sidebar-foreground transition-all w-full h-auto hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">{label}</span>
            </Button>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" className="w-64 p-2 ml-2">
            <div className="text-lg font-semibold p-2 border-b mb-2">{label}</div>
            <div className="max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col gap-1 p-1">
                    {children}
                </div>
            </div>
        </HoverCardContent>
    </HoverCard>
);


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

    const unsubscribeZones = subscribeToZones(user.uid, (fetchedZones, error) => {
      if (error) {
        console.error("Error subscribing to zones in sidebar:", error);
        toast({ title: "Real-time Error", description: "Could not update zones list.", variant: "destructive" });
        return;
      }
      setZones(fetchedZones);
    });

    const unsubscribeContent = subscribeToContentItems(user.uid, (items, error) => {
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
        const availablePredefinedTypes = fetchedContentTypes.filter(type => predefinedContentTypes[type]);
        setContentTypes(availablePredefinedTypes);
    });

    return () => {
      unsubscribeZones();
      unsubscribeContent();
    };
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

  const getIconComponent = (iconName?: string): React.ElementType => {
    if (iconName && iconMap[iconName]) return iconMap[iconName];
    return Bookmark;
  };

  return (
    <>
      <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:block w-20 fixed top-0 left-0 h-full z-30">
        <div className="flex h-full max-h-screen flex-col">
          <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-2">
            <Link href="/dashboard" aria-label="Home">
                <Brain size={28} className="text-primary" />
            </Link>
          </div>

          <ScrollArea className="flex-1 py-2 px-2">
            <nav className="flex flex-col items-center gap-2 text-sm font-medium">
              <SidebarLink href="/dashboard" icon={Home}>Home</SidebarLink>
              <SidebarLink href="/declutter" icon={Sparkles}>Declutter</SidebarLink>
              
              <HoverNavButton icon={Bookmark} label="Zones">
                {zones.length > 0 ? zones.map(zone => {
                  const Icon = getIconComponent(zone.icon);
                  return (
                      <Link key={zone.id} href={`/zones/${zone.id}`} className="flex items-center gap-3 rounded-md p-2 text-popover-foreground transition-all hover:bg-accent/50">
                          <Icon className="h-4 w-4 opacity-70" />
                          <span className="truncate">{zone.name}</span>
                      </Link>
                  );
                }) : <p className="p-2 text-xs text-muted-foreground">No zones found.</p>}
              </HoverNavButton>

              <HoverNavButton icon={Tag} label="Tags">
                {actualTags.length > 0 ? actualTags.map(tag => (
                  <Link key={tag.name} href={`/tags/${encodeURIComponent(tag.name)}`} className="flex items-center gap-3 rounded-md p-2 text-popover-foreground transition-all hover:bg-accent/50">
                      <span className="text-muted-foreground">#</span>
                      <span className="truncate">{tag.name}</span>
                  </Link>
                )) : <p className="p-2 text-xs text-muted-foreground">No tags found.</p>}
              </HoverNavButton>

              <HoverNavButton icon={Globe} label="Domains">
                {domains.length > 0 ? domains.map(domain => (
                  <Link key={domain} href={`/domains/${encodeURIComponent(domain)}`} className="flex items-center gap-3 rounded-md p-2 text-popover-foreground transition-all hover:bg-accent/50">
                      <Globe className="h-4 w-4 opacity-70" />
                      <span className="truncate">{formatDomainName(domain)}</span>
                  </Link>
                )) : <p className="p-2 text-muted-foreground">No domains found.</p>}
              </HoverNavButton>

              <HoverNavButton icon={ClipboardList} label="Types">
                {contentTypes.length > 0 ? contentTypes.map(typeKey => {
                   const typeDetails = predefinedContentTypes[typeKey];
                   if (!typeDetails) return null;
                   const Icon = typeDetails.icon;
                   return (
                      <Link key={typeKey} href={`/content-types/${encodeURIComponent(typeKey)}`} className="flex items-center gap-3 rounded-md p-2 text-popover-foreground transition-all hover:bg-accent/50">
                          <Icon className="h-4 w-4 opacity-70" />
                          <span className="truncate">{typeDetails.name}</span>
                      </Link>
                   )
                }) : <p className="p-2 text-xs text-muted-foreground">No content types found.</p>}
              </HoverNavButton>
            </nav>
          </ScrollArea>
          
          <div className="mt-auto flex flex-col items-center gap-2 p-2">
            <a href="/admin/dashboard" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center text-center gap-1 rounded-lg p-2 text-sidebar-foreground transition-all w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <Shield className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">Admin</span>
            </a>
            <ThemeToggle />
            <Button variant="ghost" onClick={handleLogout} className="flex w-full flex-col items-center justify-center h-auto gap-1 rounded-lg p-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
               <LogOut className="h-5 w-5" />
               <span className="text-[10px] font-medium leading-none">Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;