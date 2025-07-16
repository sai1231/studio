

'use client';
import type React from 'react';
import { Home, Tag, LogOut, Globe, ClipboardList, Bookmark, Newspaper, Film, Github, MessagesSquare, BookOpen, LucideIcon, StickyNote, Sparkles, Shield, Brain, Image as ImageIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { Zone, Tag as TagType } from '@/types';
import { ThemeToggle } from './theme-toggle';
import { useToast } from '@/hooks/use-toast';
import { getAuth, signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/icon-map';

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

const SidebarLink = ({ href, icon: Icon, children, ...props }: { href: string, icon: LucideIcon, children: React.ReactNode, [key: string]: any }) => (
  <Link href={href} className="flex flex-col items-center justify-center text-center gap-1 rounded-lg p-2 text-sidebar-foreground transition-all w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" {...props}>
    <Icon className="h-5 w-5" />
    <span className="text-[10px] font-medium leading-none">{children}</span>
  </Link>
);

const HoverNavButton = ({ icon: Icon, label, children, isEmpty }: { icon: React.ElementType, label: string, children: React.ReactNode, isEmpty: boolean }) => (
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
        <HoverCardContent side="right" align="start" className="w-[420px] p-2 ml-2">
            <div className="text-lg font-semibold p-2 border-b mb-2">{label}</div>
            <div className="max-h-[70vh] overflow-y-auto">
                {isEmpty ? (
                    <p className="p-4 text-xs text-muted-foreground text-center">No {label.toLowerCase()} yet.</p>
                ) : (
                   children
                )}
            </div>
        </HoverCardContent>
    </HoverCard>
);

const ZoneHoverCardItem: React.FC<{ zone: Zone }> = ({ zone }) => {
  const Icon = getIconComponent(zone.icon);
  return (
    <Link href={`/zones/${zone.id}`} className="block group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1">
        <div className="relative transition-transform duration-300 ease-in-out group-hover:scale-105 group-focus:scale-105">
            {/* Background Cards */}
            <div className="absolute inset-0 bg-card rounded-lg shadow-md transform-gpu rotate-2"></div>
            <div className="absolute inset-0 bg-card rounded-lg shadow-md transform-gpu -rotate-2"></div>
            
            {/* Front Card */}
            <div className="relative bg-card rounded-lg shadow-lg overflow-hidden w-full aspect-[4/3]">
                {zone.latestItem?.imageUrl ? (
                    <img
                        src={zone.latestItem.imageUrl}
                        alt={zone.latestItem?.title || 'Zone Preview'}
                        data-ai-hint="zone preview"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                        <Icon className="h-1/3 w-1/3 text-muted-foreground/30" />
                    </div>
                )}
            </div>
        </div>
        <div className="mt-2 text-center">
            <p className="text-sm font-semibold text-foreground truncate transition-colors group-hover:text-primary">{zone.name}</p>
        </div>
    </Link>
  );
};


interface AppSidebarProps {
    zones: Zone[];
    tags: TagType[];
    domains: string[];
    contentTypes: string[];
}

const AppSidebar: React.FC<AppSidebarProps> = ({ zones: allCollections, tags, domains, contentTypes }) => {
  const { toast } = useToast();
  const router = useRouter();
  const auth = getAuth();

  const zones = allCollections.filter(c => !c.isMoodboard);
  const moodboards = allCollections.filter(c => c.isMoodboard);

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
    <>
      <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:block w-20 fixed top-0 left-0 h-full z-30">
        <div className="flex h-full max-h-screen flex-col">
          <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-2">
            <Link href="/dashboard" aria-label="Home">
                <Brain size={28} className="text-primary" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2">
            <nav className="flex flex-col items-center gap-2 text-sm font-medium">
              <SidebarLink href="/dashboard" icon={Home}>Home</SidebarLink>
              <SidebarLink href="/declutter" icon={Sparkles}>Declutter</SidebarLink>
              
              <HoverNavButton icon={Bookmark} label="Zones" isEmpty={zones.length === 0}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 p-2">
                    {zones.map(zone => (
                        <ZoneHoverCardItem key={zone.id} zone={zone} />
                    ))}
                </div>
              </HoverNavButton>
              
              <HoverNavButton icon={ImageIcon} label="Moodboards" isEmpty={moodboards.length === 0}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 p-2">
                    {moodboards.map(board => (
                        <ZoneHoverCardItem key={board.id} zone={board} />
                    ))}
                </div>
              </HoverNavButton>

              <HoverNavButton icon={Tag} label="Tags" isEmpty={tags.length === 0}>
                {tags.map(tag => (
                  <Link key={tag.name} href={`/dashboard?tag=${encodeURIComponent(tag.name)}`} className="flex items-center gap-3 rounded-md p-2 text-popover-foreground transition-all hover:bg-accent/50">
                      <span className="text-muted-foreground">#</span>
                      <span className="truncate">{tag.name}</span>
                  </Link>
                ))}
              </HoverNavButton>
              
               <HoverNavButton icon={Globe} label="Domains" isEmpty={domains.length === 0}>
                {domains.map(domain => (
                  <Link key={domain} href={`/dashboard?domain=${encodeURIComponent(domain)}`} className="flex items-center gap-3 rounded-md p-2 text-popover-foreground transition-all hover:bg-accent/50">
                      <Globe className="h-4 w-4 opacity-70" />
                      <span className="truncate">{formatDomainName(domain)}</span>
                  </Link>
                ))}
              </HoverNavButton>

               <HoverNavButton icon={ClipboardList} label="Types" isEmpty={contentTypes.length === 0}>
                {contentTypes.map(typeKey => {
                   const typeDetails = predefinedContentTypes[typeKey];
                   if (!typeDetails) return null;
                   const Icon = typeDetails.icon;
                   return (
                      <Link key={typeKey} href={`/dashboard?type=${encodeURIComponent(typeKey)}`} className="flex items-center gap-3 rounded-md p-2 text-popover-foreground transition-all hover:bg-accent/50">
                          <Icon className="h-4 w-4 opacity-70" />
                          <span className="truncate">{typeDetails.name}</span>
                      </Link>
                   )
                })}
              </HoverNavButton>
              <SidebarLink href="/trash" icon={Trash2}>Trash</SidebarLink>
            </nav>
          </div>
          
          <div className="mt-auto flex flex-col items-center gap-2 p-2">
            <a href="/admin" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center text-center gap-1 rounded-lg p-2 text-sidebar-foreground transition-all w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
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
