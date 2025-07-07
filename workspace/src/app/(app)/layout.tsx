
'use client';
import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import AddTodoDialog from '@/components/core/AddTodoDialog';
import RecordVoiceDialog from '@/components/core/RecordVoiceDialog';
import type { Zone, ContentItem, Tag as TagType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addContentItem, getUniqueDomainsFromItems, getUniqueContentTypesFromItems, getUniqueTagsFromItems, uploadFile, subscribeToZones, subscribeToContentItems } from '@/services/contentService';
import { Button } from '@/components/ui/button';
import { Plus, UploadCloud, Home, Bookmark as BookmarkIcon, Tag, ClipboardList, Globe, Newspaper, Film, Github, MessagesSquare, BookOpen, StickyNote, FileImage, Mic, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { SearchProvider } from '@/context/SearchContext';
import { MobileNav } from '@/components/core/mobile-nav';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import TodoListSheet from '@/components/core/TodoListSheet';

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase: StickyNote,
  Home,
  Library: BookOpen,
  Bookmark: BookmarkIcon,
};

const getIconComponent = (iconName?: string): React.ElementType => {
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }
  return BookmarkIcon; 
};

// New component for the stacked card effect in the mobile sheet
const ZoneStackCard: React.FC<{ zone: Zone }> = ({ zone }) => {
    const Icon = getIconComponent(zone.icon);
    return (
        <Link href={`/zones/${zone.id}`} className="block group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1">
            <div className="relative transition-transform duration-300 ease-in-out group-hover:scale-105 group-focus:scale-105">
                {/* Background Cards */}
                <div className="absolute inset-0 top-1 left-1 bg-card rounded-lg shadow-sm"></div>
                <div className="absolute inset-0 top-0.5 left-0.5 bg-card rounded-lg shadow"></div>
                
                {/* Front Card */}
                <div className="relative bg-card rounded-lg shadow-lg overflow-hidden w-full aspect-[4/3]">
                    {zone.latestItem?.imageUrl ? (
                        <img
                            src={zone.latestItem.imageUrl}
                            alt={zone.latestItem.title || 'Zone Preview'}
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


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { 
    isAddContentDialogOpen, 
    setIsAddContentDialogOpen, 
    isAddTodoDialogOpen, 
    setIsAddTodoDialogOpen,
    isRecordVoiceDialogOpen,
    setIsRecordVoiceDialogOpen,
    setNewlyAddedItem,
  } = useDialog();

  const [zones, setZones] = useState<Zone[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [allContentItems, setAllContentItems] = useState<ContentItem[]>([]);
  const [zonesWithLatestItems, setZonesWithLatestItems] = useState<Zone[]>([]);
  const { toast } = useToast();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activeMobileSheet, setActiveMobileSheet] = useState<'zones' | 'types' | 'todos' | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, router]);

  // Data fetching logic moved from sidebar to layout
  useEffect(() => {
    if (!user) return;

    const unsubscribeZones = subscribeToZones(user.uid, (fetchedZones, error) => {
      if (error) {
        console.error("Error subscribing to zones in layout:", error);
        toast({ title: "Real-time Error", description: "Could not update zones list.", variant: "destructive" });
        return;
      }
      setZones(fetchedZones);
    });

    const unsubscribeContent = subscribeToContentItems(user.uid, (items, error) => {
        if (error) {
            console.error("Error subscribing to content items in layout:", error);
            toast({ title: "Real-time Error", description: "Could not update sidebar content.", variant: "destructive" });
            return;
        }
        setAllContentItems(items);
        setDomains(getUniqueDomainsFromItems(items));
        setTags(getUniqueTagsFromItems(items));
        setContentTypes(getUniqueContentTypesFromItems(items));
    });

    return () => {
      unsubscribeZones();
      unsubscribeContent();
    };
  }, [user, toast]);

  useEffect(() => {
    const zonesMap = new Map<string, ContentItem>();
    
    // Create a map of the most recent item for each zoneId
    allContentItems.forEach(item => {
        if (item.zoneId) {
            const existingLatest = zonesMap.get(item.zoneId);
            if (!existingLatest || new Date(item.createdAt) > new Date(existingLatest.createdAt)) {
                zonesMap.set(item.zoneId, item);
            }
        }
    });

    // Map over the original zones to preserve order and add the latest item
    const newZonesWithItems = zones.map(zone => ({
        ...zone,
        latestItem: zonesMap.get(zone.id)
    }));
    
    setZonesWithLatestItems(newZonesWithItems);
  }, [zones, allContentItems]);

  const handleAddContentAndRefresh = useCallback(async (newContentData: Omit<ContentItem, 'id' | 'createdAt'>) => {
    if (!user) {
      toast({ title: "Not Authenticated", description: "You must be logged in to add content.", variant: "destructive" });
      return;
    }
    
    const currentToast = toast({
      title: `Saving ${newContentData.type === 'todo' ? 'TODO' : 'Content'}...`,
      description: "Please wait...",
    });

    try {
      const contentWithUser = { ...newContentData, userId: user.uid };
      const addedItem = await addContentItem(contentWithUser);

      currentToast.update({
        id: currentToast.id,
        title: `${addedItem.type.charAt(0).toUpperCase() + addedItem.type.slice(1)} Saved!`,
        description: `"${addedItem.title}" has been saved.`,
      });

      if (isAddContentDialogOpen) setIsAddContentDialogOpen(false);
      
      setNewlyAddedItem(addedItem);

    } catch (error) {
      console.error("Error saving content from layout:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      currentToast.update({
        id: currentToast.id,
        title: "Error Saving",
        description: `Could not save your item: ${errorMessage}.`,
        variant: "destructive",
      });
    }
  }, [user, toast, isAddContentDialogOpen, setIsAddContentDialogOpen, setNewlyAddedItem]);

  const isValidUrl = (s: string) => { try { new URL(s); return true; } catch (_) { return false; } };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.types.some(t => ['Files', 'text/uri-list', 'text/plain'].includes(t))) {
      setIsDraggingOver(true);
    }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.types.includes('application/x-mati-internal')) return;
    if (isAuthLoading || !user) {
        toast({ title: "Hold on...", description: "Still getting things ready. Please try again in a moment.", variant: "default" });
        return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';

        if (!isImage && !isPdf) {
          toast({ title: `Unsupported File: ${file.name}`, description: "You can only upload images or PDF files.", variant: "destructive" });
          continue; // Skip this file and go to the next
        }
        
        const fileTypeForUpload = isImage ? 'image' : 'pdf';
        
        const uploadToast = toast({
          title: `Uploading ${fileTypeForUpload}...`,
          description: file.name,
        });

        try {
          const folder = isImage ? 'contentImages' : 'contentPdfs';
          const path = `${folder}/${user.uid}/${Date.now()}_${file.name}`;
          const uploadedFileUrl = await uploadFile(file, path);

          uploadToast.update({
             id: uploadToast.id,
             title: `Saving ${file.name}...`,
             description: 'Upload complete, now adding to your collection.',
          });

          const contentData = isImage
            ? {
                type: 'image', title: file.name, imageUrl: uploadedFileUrl,
                tags: [{id: 'dnd-drop', name: 'dropped'}], status: 'pending-analysis',
              } as Omit<ContentItem, 'id' | 'createdAt'>
            : {
                type: 'link', title: file.name, url: uploadedFileUrl, contentType: 'PDF',
                domain: 'mati.internal.storage', tags: [{id: 'dnd-drop', name: 'dropped'}],
                status: 'pending-analysis',
              } as Omit<ContentItem, 'id' | 'createdAt'>;

          const contentWithUser = { ...contentData, userId: user.uid };
          const addedItem = await addContentItem(contentWithUser);
          
          uploadToast.update({
            id: uploadToast.id,
            title: `Saved: ${addedItem.title}`,
            description: `Your ${fileTypeForUpload} has been saved.`,
            variant: 'default',
          });

          setNewlyAddedItem(addedItem);

        } catch (error: any) {
          uploadToast.update({
            id: uploadToast.id,
            title: `Failed to save ${file.name}`,
            description: error.message || "An unknown error occurred.",
            variant: 'destructive'
          });
        }
      }
      return;
    }

    let contentData: Omit<ContentItem, 'id' | 'createdAt'> | null = null;
    const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (uri && isValidUrl(uri)) {
        let metadata = { title: '', description: '', faviconUrl: '', imageUrl: '' };
        try {
            const response = await fetch(`/api/scrape-metadata?url=${encodeURIComponent(uri)}`);
            if (response.ok) { metadata = await response.json(); }
        } catch (e) { console.error("Failed to scrape metadata for dropped link:", e); }
        if (!metadata.title) {
            try { metadata.title = new URL(uri).hostname.replace(/^www\./, ''); } 
            catch { metadata.title = "Untitled Link"; }
        }
        contentData = {
            type: 'link', url: uri, title: metadata.title, description: metadata.description, 
            faviconUrl: metadata.faviconUrl, imageUrl: metadata.imageUrl,
            tags: [{ id: 'dnd-drop', name: 'dropped' }], domain: new URL(uri).hostname.replace(/^www\./, ''),
            status: 'pending-analysis',
        };
    } else {
        const text = e.dataTransfer.getData('text/plain');
        if (text) {
            const generatedTitle = text.split(/\s+/).slice(0, 5).join(' ') + (text.split(/\s+/).length > 5 ? '...' : '');
            contentData = {
                type: 'note', title: generatedTitle || 'Untitled Note', description: text,
                tags: [{ id: 'dnd-drop', name: 'dropped' }], contentType: 'Note', status: 'pending-analysis',
            };
        }
    }

    if (contentData) {
      await handleAddContentAndRefresh(contentData);
    } else {
      toast({ title: "Drop Not Processed", description: "Could not handle the dropped content type.", variant: "default" });
    }
  };
  
  if (isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const MobileSheetLink = ({ href, children, icon: Icon }: { href: string; children: React.ReactNode; icon: React.ElementType }) => (
    <Link href={href} onClick={() => setActiveMobileSheet(null)} className="flex items-center gap-4 rounded-lg p-3 text-popover-foreground transition-all hover:bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="truncate font-medium">{children}</span>
    </Link>
  );

  const predefinedContentTypes: Record<string, { icon: React.ElementType, name: string }> = {
      Article: { icon: BookOpen, name: 'Articles' },
      Note: { icon: StickyNote, name: 'Notes' },
      Image: { icon: FileImage, name: 'Images' },
      'Voice Recording': { icon: Mic, name: 'Voice Recordings' },
      Movie: { icon: Film, name: 'Movies' },
      PDF: { icon: BookOpen, name: 'PDFs' },
      Post: { icon: Newspaper, name: 'Posts' },
      Reel: { icon: Film, name: 'Reels' },
      Repositories: { icon: Github, name: 'Repositories' },
      Tweet: { icon: MessagesSquare, name: 'Tweets' },
      Thread: { icon: MessagesSquare, name: 'Threads' },
  };

  const sheetContentMap = {
    zones: {
        title: 'Browse Zones',
        content: zonesWithLatestItems.length > 0 
            ? <div className="grid grid-cols-2 gap-x-4 gap-y-6 p-2">
                {zonesWithLatestItems.map(zone => (
                    <ZoneStackCard key={zone.id} zone={zone} />
                ))}
              </div>
            : <p className="p-4 text-center text-sm text-muted-foreground">No zones created yet.</p>
    },
    types: {
        title: 'Browse Content Types',
        content: contentTypes.length > 0 ? contentTypes.map(typeKey => {
            const typeDetails = predefinedContentTypes[typeKey] || { icon: StickyNote, name: typeKey };
            const Icon = typeDetails.icon;
            return <MobileSheetLink key={typeKey} href={`/content-types/${encodeURIComponent(typeKey)}`} icon={Icon}>{typeDetails.name}</MobileSheetLink>
        }) : <p className="p-4 text-center text-sm text-muted-foreground">No content types found.</p>
    },
    todos: {
        title: 'Quick TODOs',
        content: <TodoListSheet />,
    }
  };

  return (
    <SearchProvider>
      <div className="flex min-h-screen w-full relative">
        <AppSidebar zones={zonesWithLatestItems} tags={tags} domains={domains} contentTypes={contentTypes} />
        <div className="flex flex-col flex-1 min-w-0 md:ml-20">
          <AppHeader />
          <main
            className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto relative pb-20 md:pb-8"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {children}
            {isDraggingOver && (
              <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex flex-col items-center justify-center z-50 pointer-events-none rounded-lg border-2 border-dashed border-primary">
                <UploadCloud className="h-16 w-16 text-primary mb-4" />
                <p className="text-lg font-semibold text-primary">Drop here to save</p>
              </div>
            )}
          </main>
        </div>
        <AddContentDialog
          open={isAddContentDialogOpen}
          onOpenChange={setIsAddContentDialogOpen}
          zones={zones}
          onContentAdd={handleAddContentAndRefresh}
        />
        <AddTodoDialog
          open={isAddTodoDialogOpen}
          onOpenChange={setIsAddTodoDialogOpen}
        />
        <RecordVoiceDialog
          open={isRecordVoiceDialogOpen}
          onOpenChange={setIsRecordVoiceDialogOpen}
          onRecordingSave={handleAddContentAndRefresh}
        />

        <Button
          size="lg"
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 rounded-full h-16 w-16 shadow-xl z-40 bg-primary hover:bg-primary/90 text-primary-foreground hidden md:flex items-center justify-center"
          aria-label="Add Content"
          disabled={isAuthLoading}
          onClick={() => setIsAddContentDialogOpen(true)}
        >
          <Plus className="h-7 w-7" />
        </Button>
        <MobileNav onNavClick={setActiveMobileSheet} />
        <Sheet open={!!activeMobileSheet} onOpenChange={(isOpen) => !isOpen && setActiveMobileSheet(null)}>
            <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>{activeMobileSheet ? sheetContentMap[activeMobileSheet].title : ''}</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-grow p-2">
                    <div className="flex flex-col gap-1">
                        {activeMobileSheet && sheetContentMap[activeMobileSheet].content}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
      </div>
    </SearchProvider>
  );
}
    