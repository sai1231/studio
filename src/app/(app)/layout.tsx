

'use client';
import type React from 'react';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import AddTodoDialog from '@/components/core/AddTodoDialog';
import RecordVoiceDialog from '@/components/core/RecordVoiceDialog';
import FocusModeDialog from '@/components/core/FocusModeDialog';
import type { Zone, ContentItem, Tag as TagType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addContentItem, getUniqueDomainsFromItems, getUniqueContentTypesFromItems, getUniqueTagsFromItems, uploadFile, subscribeToZones, subscribeToContentItems, addZone } from '@/services/contentService';
import { Button } from '@/components/ui/button';
import { Plus, UploadCloud, Home, Bookmark as BookmarkIcon, Tag, ClipboardList, Globe, Newspaper, Film, Github, MessagesSquare, BookOpen, StickyNote, FileImage, Mic, ListChecks, View } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { SearchProvider } from '@/context/SearchContext';
import { MobileNav } from '@/components/core/mobile-nav';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import TodoListSheet from '@/components/core/TodoListSheet';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { getIconComponent } from '@/lib/icon-map';

// This component was moved out from app-sidebar to be reused in the mobile sheet.
const ZoneStackCard: React.FC<{ zone: Zone }> = ({ zone }) => {
    const Icon = getIconComponent(zone.icon);
    return (
        <Link href={`/dashboard?zone=${zone.id}`} className="block group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1">
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

const isValidUrl = (s: string) => { try { new URL(s); return true; } catch (_) { return false; } };

const ExtensionSaveHandler = () => {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const action = searchParams.get('action');
        
        if (action !== 'save' || isProcessing || !user) {
            return;
        }

        const processSave = async () => {
            setIsProcessing(true);
            const url = searchParams.get('url');
            const title = searchParams.get('title');
            const selection = searchParams.get('selection');
            let contentData: Omit<ContentItem, 'id' | 'createdAt'> | null = null;
            
            try {
                if (url) {
                    let metadata = { title: title || '', description: '', faviconUrl: '', imageUrl: '' };
                    try {
                        const response = await fetch(`/api/scrape-metadata?url=${encodeURIComponent(url)}`);
                        if (response.ok) { metadata = await response.json(); }
                    } catch (e) { console.error("Failed to scrape metadata for dropped link:", e); }
                    if (!metadata.title) {
                        try { metadata.title = new URL(url).hostname.replace(/^www\./, ''); } 
                        catch { metadata.title = "Untitled Link"; }
                    }
                    contentData = {
                        type: 'link', url: url, title: metadata.title, description: metadata.description,
                        faviconUrl: metadata.faviconUrl, imageUrl: metadata.imageUrl, tags: [],
                        domain: new URL(url).hostname.replace(/^www\./, ''), status: 'pending-analysis',
                    };
                } else if (selection) {
                    const generatedTitle = selection.split(/\s+/).slice(0, 5).join(' ') + (selection.split(/\s+/).length > 5 ? '...' : '');
                    let description = `> ${selection}`; // Quote the selection
                    const source = {url: searchParams.get('sourceUrl'), title: searchParams.get('sourceTitle')};
                    if (source && source.url) {
                        description += `\n\n_Source: [${source.title || source.url}](${source.url})_`;
                    }

                    contentData = {
                        type: 'note', title: generatedTitle, description: description, contentType: 'Note',
                    };
                }

                if (contentData) {
                    await addContentItem({ ...contentData, userId: user.uid });
                    // No toast here, extension shows one. The tab will just close.
                }

            } catch (error) {
                console.error("Failed to save from extension", error);
                // Could potentially show an error here but it would require the tab to stay open.
            } finally {
                // The tab that was opened by the extension can close itself.
                window.close();
            }
        };

        processSave();
        
    }, [searchParams, user, isProcessing, router]);

    if (searchParams.get('action') === 'save') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Saving to Mati...</p>
            </div>
        );
    }
    
    return null;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { 
    isAddContentDialogOpen, 
    setIsAddContentDialogOpen, 
    isAddTodoDialogOpen, 
    setIsAddTodoDialogOpen,
    isRecordVoiceDialogOpen,
    setIsRecordVoiceDialogOpen,
    isFocusModeOpen,
    focusModeItem,
    closeFocusMode,
    setNewlyAddedItem,
  } = useDialog();

  const [allZones, setAllZones] = useState<Zone[]>([]);
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
        return;
      }
      setAllZones(fetchedZones);
    });

    const unsubscribeContent = subscribeToContentItems(user.uid, (items, error) => {
        if (error) {
            console.error("Error subscribing to content items in layout:", error);
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
  }, [user]);

  useEffect(() => {
    const collectionsMap = new Map<string, ContentItem>();
    
    // Create a map of the most recent item for each zone/moodboard
    allContentItems.forEach(item => {
        (item.zoneIds || []).forEach(zoneId => {
            const existingLatest = collectionsMap.get(zoneId);
            if (!existingLatest || new Date(item.createdAt) > new Date(existingLatest.createdAt)) {
                collectionsMap.set(zoneId, item);
            }
        })
    });

    // Map over the original zones to preserve order and add the latest item
    const newZonesWithItems = allZones.map(zone => ({
        ...zone,
        latestItem: collectionsMap.get(zone.id)
    }));
    
    setZonesWithLatestItems(newZonesWithItems);
  }, [allZones, allContentItems]);
  

  const handleAddContentAndRefresh = useCallback(async (newContentData: Omit<ContentItem, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      const contentWithUser = { ...newContentData, userId: user.uid };
      const addedItem = await addContentItem(contentWithUser);
      
      if (isAddContentDialogOpen) setIsAddContentDialogOpen(false);
      
      setNewlyAddedItem(addedItem);

    } catch (error) {
      console.error("Error saving content from layout:", error);
    }
  }, [user, isAddContentDialogOpen, setIsAddContentDialogOpen, setNewlyAddedItem]);

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
        return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';

        if (!isImage && !isPdf) {
          continue; // Skip this file and go to the next
        }
        
        try {
          const folder = isImage ? 'contentImages' : 'contentPdfs';
          const path = `${folder}/${user.uid}/${Date.now()}_${file.name}`;
          const uploadedFileUrl = await uploadFile(file, path);

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

          await handleAddContentAndRefresh(contentData);
        } catch (error: any) {
          console.error(error);
        }
      }
      return;
    }

    let contentData: Omit<ContentItem, 'id' | 'createdAt'> | null = null;
    const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (uri && isValidUrl(uri)) {
      const isImageUrl = /\.(jpg|jpeg|png|gif|webp)$/i.test(new URL(uri).pathname);
       if (isImageUrl) {
            try {
                const response = await fetch(uri);
                const blob = await response.blob();
                const filename = new URL(uri).pathname.split('/').pop() || `image-${Date.now()}`;
                const file = new File([blob], filename, { type: blob.type });

                if (!user) throw new Error("User not authenticated for image upload.");
                
                const path = `contentImages/${user.uid}/${Date.now()}_${file.name}`;
                const downloadUrl = await uploadFile(file, path);
                
                contentData = {
                    type: 'image', title: file.name, imageUrl: downloadUrl,
                    status: 'pending-analysis', tags: [{ id: 'dragged', name: 'dragged' }],
                };
            } catch (e) {
                console.error("Failed to import image from URL:", e);
                // Fallback to saving as a regular link
                contentData = { type: 'link', url: uri, status: 'pending-analysis', tags: [{ id: 'dragged', name: 'dragged' }] };
            }
        } else {
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
        }
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
    }
  };

  // New handler for paste event
  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    // Prevent paste action if a dialog or input is focused
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
      return;
    }
    
    if (isAuthLoading || !user) return;
    
    const items = event.clipboardData?.items;
    if (!items) return;

    let contentData: Omit<ContentItem, 'id' | 'createdAt'> | null = null;
    let handled = false;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        handled = true;
        const file = item.getAsFile();
        if (file) {
          try {
            const path = `contentImages/${user.uid}/${Date.now()}_pasted_image.png`;
            const uploadedFileUrl = await uploadFile(file, path);
            contentData = {
              type: 'image',
              title: `Pasted Image - ${new Date().toLocaleString()}`,
              imageUrl: uploadedFileUrl,
              tags: [{ id: 'pasted', name: 'pasted' }],
              status: 'pending-analysis'
            };
            await handleAddContentAndRefresh(contentData);
          } catch(e) {
             console.error("Failed to upload pasted image:", e);
          }
        }
        break; // Handle first image found
      }
    }

    if (!handled) {
      for (const item of Array.from(items)) {
        if (item.type === 'text/plain') {
          item.getAsString(async (text) => {
            if (isValidUrl(text)) {
              event.preventDefault();
              let metadata = { title: '', description: '', faviconUrl: '', imageUrl: '' };
              try {
                const response = await fetch(`/api/scrape-metadata?url=${encodeURIComponent(text)}`);
                if (response.ok) { metadata = await response.json(); }
              } catch (e) { console.error("Failed to scrape metadata for pasted link:", e); }
              
              if (!metadata.title) {
                try { metadata.title = new URL(text).hostname.replace(/^www\./, ''); } 
                catch { metadata.title = "Untitled Link"; }
              }

              contentData = {
                  type: 'link', url: text, title: metadata.title, description: metadata.description, 
                  faviconUrl: metadata.faviconUrl, imageUrl: metadata.imageUrl,
                  tags: [{ id: 'pasted', name: 'pasted' }], domain: new URL(text).hostname.replace(/^www\./, ''),
                  status: 'pending-analysis',
              };
              await handleAddContentAndRefresh(contentData);
            }
          });
          break; // Handle first text item
        }
      }
    }
  }, [user, isAuthLoading, handleAddContentAndRefresh]);
  
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);
  
  const handleAddZoneInLayout = async (zoneName: string, isMoodboard: boolean = false): Promise<Zone | null> => {
    if (!zoneName.trim() || !user) return null;
    try {
      const newZone = await addZone(zoneName.trim(), user.uid, isMoodboard);
      // The `allZones` state will update automatically via the Firestore listener (subscribeToZones)
      return newZone;
    } catch (e) {
      console.error('Error creating zone:', e);
      return null;
    }
  };
  
  if (isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
        content: zonesWithLatestItems.filter(z => !z.isMoodboard).length > 0 
            ? <div className="grid grid-cols-2 gap-x-4 gap-y-6 p-2">
                {zonesWithLatestItems.filter(z => !z.isMoodboard).map(zone => (
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
            return <MobileSheetLink key={typeKey} href={`/dashboard?type=${encodeURIComponent(typeKey)}`} icon={Icon}>{typeDetails.name}</MobileSheetLink>
        }) : <p className="p-4 text-center text-sm text-muted-foreground">No content types found.</p>
    },
    todos: {
        title: 'Quick TODOs',
        content: <TodoListSheet />,
    }
  };

  return (
    <SearchProvider userRole={role}>
      <Suspense fallback={null}>
        <ExtensionSaveHandler />
      </Suspense>
      <div className="flex min-h-screen w-full relative">
        <AppSidebar 
            zones={zonesWithLatestItems} 
            tags={tags} 
            domains={domains} 
            contentTypes={contentTypes} 
        />
        <div className="flex flex-col flex-1 min-w-0 md:ml-20">
          <AppHeader />
          <main
            className="flex-1 px-2 py-4 md:px-4 md:py-6 bg-background overflow-auto relative pb-20 md:pb-8"
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
            zones={allZones.filter(z => !z.isMoodboard)}
            onContentAdd={handleAddContentAndRefresh}
            onZoneCreate={(name) => handleAddZoneInLayout(name, false)}
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
        
        <FocusModeDialog
            item={focusModeItem}
            open={isFocusModeOpen}
            onOpenChange={(open) => !open && closeFocusMode()}
            zones={allZones.filter(z => !z.isMoodboard)}
            onZoneCreate={(name) => handleAddZoneInLayout(name, false)}
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
