

'use client';
import type React from 'react';
import { useState } from 'react';
import { Home, Tag, LogOut, Globe, ClipboardList, Bookmark, Newspaper, Film, Github, MessagesSquare, BookOpen, LucideIcon, StickyNote, Sparkles, Shield, Brain, Image as ImageIcon, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { Zone, Tag as TagType } from '@/types';
import { ThemeToggle } from './theme-toggle';
import { getAuth, signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/icon-map';
import MatiLogo from './mati-logo';
import { deleteZone } from '@/services/contentService';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

const predefinedContentTypes: Record<string, { icon: LucideIcon, name: string }> = {
  Post: { icon: Newspaper, name: 'Post' },
  Reel: { icon: Film, name: 'Reel' },
  Note: { icon: StickyNote, name: 'Note' },
  Image: { icon: ImageIcon, name: 'Image' },
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

const ZoneHoverCardItem: React.FC<{ zone: Zone; href: string; onDelete: (zoneId: string, zoneName: string, itemCount: number) => void; isDeleting: boolean; }> = ({ zone, href, onDelete, isDeleting }) => {
  const Icon = getIconComponent(zone.icon);
  const itemCount = zone.itemCount || 0;

  return (
    <div className="relative group p-1">
        <Link href={href} className="block group/link focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
            <div className="relative transition-transform duration-300 ease-in-out group-hover/link:scale-105 group-focus/link:scale-105">
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
        </Link>
        <Button
            size="icon"
            variant="ghost"
            className="absolute top-0 right-0 z-10 h-6 w-6 rounded-full bg-background/50 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onDelete(zone.id, zone.name, itemCount)}
            disabled={isDeleting}
        >
            <Trash2 className="h-3 w-3" />
        </Button>
        <div className="mt-2 text-center">
            <p className="text-sm font-semibold text-foreground truncate transition-colors group-hover/link:text-primary">{zone.name}</p>
        </div>
    </div>
  );
};


interface AppSidebarProps {
    zones: Zone[];
    tags: TagType[];
    domains: string[];
    contentTypes: string[];
}

const AppSidebar: React.FC<AppSidebarProps> = ({ zones: allCollections, tags, domains, contentTypes }) => {
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth();
  
  const [zoneToDelete, setZoneToDelete] = useState<{id: string, name: string, itemCount: number} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const zones = allCollections.filter(c => !c.isMoodboard);
  const moodboards = allCollections.filter(c => c.isMoodboard);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleDeleteClick = (zoneId: string, zoneName: string, itemCount: number) => {
    if (itemCount > 0) {
      setZoneToDelete({ id: zoneId, name: zoneName, itemCount });
    } else {
      // If there are no items, delete immediately without confirmation
      confirmDelete(zoneId, zoneName);
    }
  };

  const confirmDelete = async (zoneId: string, zoneName: string) => {
    setIsDeleting(true);
    setZoneToDelete(null);
    try {
      await deleteZone(zoneId);
      toast({
        title: "Zone Deleted",
        description: `The zone "${zoneName}" and all its content have been deleted.`,
      });
    } catch (e) {
      console.error("Error deleting zone:", e);
      toast({
        title: "Error",
        description: `Could not delete the zone "${zoneName}".`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
                <MatiLogo iconSize={32} showName={false} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2">
            <nav className="flex flex-col items-center gap-2 text-sm font-medium">
              <SidebarLink href="/dashboard" icon={Home}>Home</SidebarLink>
              <SidebarLink href="/declutter" icon={Sparkles}>Declutter</SidebarLink>
              
              <HoverNavButton icon={Bookmark} label="Zones" isEmpty={zones.length === 0}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 p-2">
                    {zones.map(zone => (
                        <ZoneHoverCardItem key={zone.id} zone={zone} href={`/zones/${zone.id}`} onDelete={handleDeleteClick} isDeleting={isDeleting} />
                    ))}
                </div>
              </HoverNavButton>
              
              <HoverNavButton icon={ImageIcon} label="Moodboards" isEmpty={moodboards.length === 0}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 p-2">
                    {moodboards.map(board => (
                        <ZoneHoverCardItem key={board.id} zone={board} href={`/zones/${board.id}`} onDelete={handleDeleteClick} isDeleting={isDeleting}/>
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
                   const typeDetails = predefinedContentTypes[typeKey] || { icon: ClipboardList, name: typeKey };
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
            <ThemeToggle />
            <Button variant="ghost" onClick={handleLogout} className="flex w-full flex-col items-center justify-center h-auto gap-1 rounded-lg p-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
               <LogOut className="h-5 w-5" />
               <span className="text-[10px] font-medium leading-none">Logout</span>
            </Button>
          </div>
        </div>
      </aside>
       <AlertDialog open={!!zoneToDelete} onOpenChange={(isOpen) => !isOpen && setZoneToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the zone <strong className="text-foreground">"{zoneToDelete?.name}"</strong> and all <strong className="text-foreground">{zoneToDelete?.itemCount}</strong> items within it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => zoneToDelete && confirmDelete(zoneToDelete.id, zoneToDelete.name)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppSidebar;
