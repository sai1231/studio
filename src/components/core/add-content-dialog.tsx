
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
import type { Zone, ContentItemType, Tag, ContentItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addZone } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';

const contentFormSchemaBase = z.object({
  url: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  title: z.string().optional(), // No longer required in form
  description: z.string().optional(),
  zoneId: z.string().optional(),
  contentType: z.string().optional(),
  domain: z.string().optional(),
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

  const form = useForm<z.infer<typeof contentFormSchemaBase>>({
    resolver: zodResolver(contentFormSchemaBase),
    defaultValues: {
      url: '',
      title: '',
      description: '',
      zoneId: '',
      contentType: '',
      domain: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        url: '',
        title: '',
        description: '',
        zoneId: '',
        contentType: '',
        domain: '',
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

  async function onSubmit(values: z.infer<typeof contentFormSchemaBase>) {
    setIsSaving(true);

    const type: ContentItemType = (!!values.url && z.string().url().safeParse(values.url).success ? 'link' : 'note');
    const finalDescription = values.description || undefined;

    if (type === 'note' && !finalDescription) {
        form.setError('description', { type: 'manual', message: `Content is required for notes.` });
        setIsSaving(false);
        return;
    }

    let generatedTitle = '';
    if (type === 'link' && values.url) {
        try {
            generatedTitle = new URL(values.url).hostname.replace(/^www\./, '');
        } catch(e) {
            generatedTitle = 'Untitled Link';
        }
    } else if (type === 'note' && finalDescription) {
        const textContent = finalDescription.trim();
        generatedTitle = textContent.split(/\s+/).slice(0, 5).join(' ');
        if (textContent.split(/\s+/).length > 5) {
            generatedTitle += '...';
        }
        if (!generatedTitle) {
            generatedTitle = 'Untitled Note';
        }
    } else {
        generatedTitle = type === 'link' ? 'Untitled Link' : 'Untitled Note';
    }


    const contentData: Partial<Omit<ContentItem, 'id' | 'createdAt'>> = {
      type,
      title: generatedTitle,
      description: finalDescription,
      zoneId: values.zoneId || undefined,
      tags: currentTags,
      url: type === 'link' ? values.url : undefined,
      domain: type === 'link' && values.url ? new URL(values.url).hostname.replace(/^www\./, '') : undefined,
    };
    
    if (type === 'link') {
      contentData.status = 'pending-analysis';
    }
    
    if (type === 'note') {
      contentData.contentType = 'Note';
    }

    try {
      await onContentAdd(contentData as Omit<ContentItem, 'id' | 'createdAt'>);
    } catch (error) {
      // Error is handled by the caller
    } finally {
      setIsSaving(false);
    }
  }

  const dialogTitle = "Add Content";
  const dialogDescriptionText = "Provide a URL to save a link, or just add content to save a note. Select a zone.";

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

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" {...form.register('url')} placeholder="https://example.com" className="focus-visible:ring-accent"/>
            {form.formState.errors.url && <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Content
            </Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Write your content or note here..."
              className={cn(
                "min-h-[120px] focus-visible:ring-accent",
                form.formState.errors.description && "border-destructive focus-visible:ring-destructive"
              )}
            />
             {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zoneId">Zone</Label>
             <Popover open={isZonePopoverOpen} onOpenChange={setIsZonePopoverOpen}>
              <PopoverTrigger asChild>
                  <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isZonePopoverOpen}
                      className={cn(
                          "w-full justify-between",
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
            <div className="flex justify-between items-center">
              <Label htmlFor="tags">Tags</Label>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {currentTags.map(tag => (
                <Badge key={tag.id} variant="default" className="bg-primary text-primary-foreground">
                  {tag.name}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 focus:outline-none">
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
              className="focus-visible:ring-accent"
            />
          </div>
        </form>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => { if (onOpenChange) onOpenChange(false); }}>Cancel</Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialog;
