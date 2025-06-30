
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, Check, Plus, ChevronDown, Bookmark, Briefcase, Home, Library } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { Zone, ContentItem, Tag } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addZone } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';

// Simplified schema for the new single-textarea input
const mainContentSchema = z.object({
  mainContent: z.string().min(1, { message: 'Please enter a note or a URL.' }),
  zoneId: z.string().optional(),
});


export interface AddContentDialogOpenChange {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface AddContentDialogProps extends AddContentDialogOpenChange {
  zones: Zone[];
  onContentAdd: (newContent: Omit<ContentItem, 'id' | 'createdAt'>) => void;
  children?: React.ReactNode;
}

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase,
  Home,
  Library,
  Bookmark,
};

const getIconComponent = (iconName?: string): React.ElementType => {
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }
  return Bookmark; // Default icon
};


const AddContentDialog: React.FC<AddContentDialogProps> = ({ open, onOpenChange, zones, onContentAdd, children }) => {
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [internalZones, setInternalZones] = useState<Zone[]>(zones);
  const [isZonePopoverOpen, setIsZonePopoverOpen] = useState(false);
  const [zoneSearchText, setZoneSearchText] = useState('');

  const form = useForm<z.infer<typeof mainContentSchema>>({
    resolver: zodResolver(mainContentSchema),
    defaultValues: {
      mainContent: '',
      zoneId: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        mainContent: '',
        zoneId: '',
      });
      setCurrentTags([]);
      setTagInput('');
      setInternalZones(zones);
    }
  }, [open, form, zones]);

  useEffect(() => {
    setInternalZones(zones);
  }, [zones]);

  const watchedZoneId = form.watch('zoneId');

  const handleCreateZone = async (zoneName: string) => {
    if (!zoneName.trim() || isSaving || !user) return;
    setIsSaving(true);
    try {
      const newZone = await addZone(zoneName.trim(), user.uid);
      setInternalZones(prev => [...prev, newZone]);
      form.setValue('zoneId', newZone.id, { shouldTouch: true, shouldValidate: true });
      toast({ title: "Zone Created", description: `Zone "${newZone.name}" created and selected.` });
    } catch (e) {
      console.error('Error creating zone:', e);
      toast({ title: "Error", description: "Could not create new zone.", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setIsZonePopoverOpen(false);
      setZoneSearchText('');
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !currentTags.find(tag => tag.name.toLowerCase() === tagInput.trim().toLowerCase())) {
      setCurrentTags([...currentTags, { id: Date.now().toString(), name: tagInput.trim() }]);
    }
    setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const removeTag = (tagToRemove: Tag) => {
    setCurrentTags(currentTags.filter(tag => tag.id !== tagToRemove.id));
  };

  // Helper to find the first valid URL in a string
  const extractUrl = (text: string): string | null => {
    const words = text.split(/[\s\n]+/);
    for (const word of words) {
        try {
            // A simple check to see if it looks like a URL before trying new URL()
            if (word.startsWith('http://') || word.startsWith('https://')) {
                const url = new URL(word);
                return url.href;
            }
        } catch (_) {
            // Not a valid URL, continue
        }
    }
    return null;
  };

  async function onSubmit(values: z.infer<typeof mainContentSchema>) {
    setIsSaving(true);

    const { mainContent, zoneId } = values;
    const extractedUrl = extractUrl(mainContent);

    let contentData: Partial<Omit<ContentItem, 'id' | 'createdAt'>>;

    if (extractedUrl) {
      // It's a LINK, so we scrape metadata first
      let metadata = {
        title: '',
        description: '',
        faviconUrl: '',
        imageUrl: '',
      };

      try {
        const response = await fetch(`/api/scrape-metadata?url=${encodeURIComponent(extractedUrl)}`);
        if (response.ok) {
            const data = await response.json();
            metadata.title = data.title;
            metadata.description = data.description;
            metadata.faviconUrl = data.faviconUrl;
            metadata.imageUrl = data.imageUrl;
        }
      } catch (e) {
        console.error("Failed to scrape metadata during content addition:", e);
      } finally {
        if (!metadata.title) {
            try {
                metadata.title = new URL(extractedUrl).hostname.replace(/^www\./, '');
            } catch {
                metadata.title = "Untitled Link";
            }
        }
      }
      
      contentData = {
        type: 'link',
        url: extractedUrl,
        mindNote: mainContent, // User's full text is saved as a Mind Note
        zoneId: zoneId || undefined,
        tags: currentTags,
        domain: new URL(extractedUrl).hostname.replace(/^www\./, ''),
        status: 'pending-analysis', // Still pending for heavier analysis
        title: metadata.title,
        description: metadata.description,
        faviconUrl: metadata.faviconUrl,
        imageUrl: metadata.imageUrl,
      };

    } else {
      // It's a NOTE
      const textContent = mainContent.trim();
      const generatedTitle = textContent.split(/\s+/).slice(0, 5).join(' ') + (textContent.split(/\s+/).length > 5 ? '...' : '');

      contentData = {
        type: 'note',
        title: generatedTitle || 'Untitled Note',
        description: textContent,
        zoneId: zoneId || undefined,
        tags: currentTags,
        contentType: 'Note',
      };
    }

    try {
      await onContentAdd(contentData as Omit<ContentItem, 'id' | 'createdAt'>);
    } catch (error) {
      // Error is handled by the caller
    } finally {
      setIsSaving(false);
    }
  }

  const dialogTitle = "Add Link or Note";
  const dialogDescriptionText = "Paste a link or just start typing. We'll figure it out and enrich it with metadata.";

  const selectedZone = internalZones.find(z => z.id === watchedZoneId);
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon);
  const zoneDisplayName = selectedZone?.name || 'Select a zone';
  const filteredZones = zoneSearchText
    ? internalZones.filter(z => z.name.toLowerCase().includes(zoneSearchText.toLowerCase()))
    : internalZones;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescriptionText}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} id="add-content-form" className="flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow overflow-y-auto pr-4 pl-1 space-y-6 py-4">

            {/* Main content area */}
            <div className="space-y-2">
              <Label htmlFor="mainContent" className="text-base font-medium">Content</Label>
              <Textarea
                id="mainContent"
                {...form.register('mainContent')}
                placeholder="Paste a URL or write your note here..."
                className={cn(
                  "min-h-[140px] text-base focus-visible:ring-accent",
                  form.formState.errors.mainContent && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {form.formState.errors.mainContent && <p className="text-sm text-destructive">{form.formState.errors.mainContent.message}</p>}
            </div>

            {/* Organization area */}
            <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
              <h3 className="text-lg font-semibold text-foreground">Organization</h3>
              <div className="space-y-2">
                <Label htmlFor="zoneId">Zone</Label>
                 <Popover open={isZonePopoverOpen} onOpenChange={setIsZonePopoverOpen}>
                  <PopoverTrigger asChild>
                      <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isZonePopoverOpen}
                          className={cn(
                              "w-full justify-between bg-background",
                              !watchedZoneId && "text-muted-foreground",
                              form.formState.errors.zoneId && "border-destructive"
                          )}
                      >
                          <div className="flex items-center">
                              <ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" />
                              <span className="truncate">{zoneDisplayName}</span>
                          </div>
                          <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                          <CommandInput
                              placeholder="Search or create zone..."
                              value={zoneSearchText}
                              onValueChange={setZoneSearchText}
                          />
                          <CommandList>
                              <CommandEmpty>
                                <div className="py-6 text-center text-sm">
                                  {zoneSearchText.trim() === '' ? 'No zones found.' : 'No matching zones found.'}
                                </div>
                              </CommandEmpty>
                              <CommandGroup>
                                  {filteredZones.map((z) => {
                                    const ListItemIcon = getIconComponent(z.icon);
                                    return (
                                      <CommandItem
                                          key={z.id}
                                          value={z.id}
                                          onSelect={() => {
                                            form.setValue('zoneId', z.id, { shouldTouch: true, shouldValidate: true });
                                            setIsZonePopoverOpen(false);
                                          }}
                                      >
                                          <Check className={cn("mr-2 h-4 w-4", watchedZoneId === z.id ? "opacity-100" : "opacity-0")} />
                                          <ListItemIcon className="mr-2 h-4 w-4 opacity-70" />
                                          {z.name}
                                      </CommandItem>
                                    );
                                  })}
                              </CommandGroup>
                              {zoneSearchText.trim() !== '' && !filteredZones.some(z => z.name.toLowerCase() === zoneSearchText.trim().toLowerCase()) && (
                                <CommandGroup className="border-t">
                                  <CommandItem
                                      onSelect={() => handleCreateZone(zoneSearchText)}
                                      className="text-primary hover:!bg-primary/10 cursor-pointer justify-start"
                                  >
                                      <Plus className="mr-2 h-4 w-4" />
                                      <span>Create "{zoneSearchText.trim()}"</span>
                                  </CommandItem>
                                </CommandGroup>
                              )}
                          </CommandList>
                      </Command>
                  </PopoverContent>
                </Popover>
                {form.formState.errors.zoneId && <p className="text-sm text-destructive">{form.formState.errors.zoneId.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {currentTags.map(tag => (
                    <Badge key={tag.id} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                      {tag.name}
                      <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 focus:outline-none rounded-full hover:bg-destructive/20 p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Add tags (press Enter or ,)"
                  className="focus-visible:ring-accent bg-background"
                />
              </div>
            </div>

          </div>
          
          <DialogFooter className="pt-4 border-t mt-auto flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => { if (onOpenChange) onOpenChange(false); }}>Cancel</Button>
            <Button type="submit" form="add-content-form" disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Content'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialog;
