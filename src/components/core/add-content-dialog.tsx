
'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { X, Loader2, Check, Plus, ChevronDown, Bookmark, Briefcase, Home, Library, FileUp, Image as ImageIcon, File as FileIcon, Mic } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { Zone, ContentItem, Tag } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addContentItem, addZone, uploadFile } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const mainContentSchema = z.object({
  mainContent: z.string(), // This will be optional if a file is uploaded
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
  return Bookmark;
};


const AddContentDialog: React.FC<AddContentDialogProps> = ({ open, onOpenChange, zones, onContentAdd, children }) => {
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { setIsRecordVoiceDialogOpen } = useDialog();

  const [internalZones, setInternalZones] = useState<Zone[]>(zones);
  const [isZonePopoverOpen, setIsZonePopoverOpen] = useState(false);
  const [zoneSearchText, setZoneSearchText] = useState('');

  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string; type: 'image' | 'pdf' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof mainContentSchema>>({
    resolver: zodResolver(mainContentSchema),
    defaultValues: {
      mainContent: '',
      zoneId: '',
    },
  });

  const watchedMainContent = form.watch('mainContent');

  useEffect(() => {
    if (open) {
      form.reset({ mainContent: '', zoneId: '' });
      setCurrentTags([]);
      setTagInput('');
      setInternalZones(zones);
      setUploadedFile(null);
      setIsUploading(false);
      setIsDragging(false);
    }
  }, [open, form, zones]);

  useEffect(() => {
    setInternalZones(zones);
  }, [zones]);

  const watchedZoneId = form.watch('zoneId');

  const handleRecordVoiceClick = () => {
    if (onOpenChange) {
      onOpenChange(false);
    }
    setIsRecordVoiceDialogOpen(true);
  };
  
  const handleFileSelected = async (file: File) => {
    if (!user) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      toast({ title: "Unsupported File", description: "You can only upload images or PDF files.", variant: "destructive" });
      return;
    }

    const fileTypeForUpload = isImage ? 'image' : 'pdf';
    setIsUploading(true);
    setUploadedFile(null);
    form.clearErrors('mainContent');

    const currentToast = toast({
      title: `Uploading ${fileTypeForUpload}...`,
      description: "Please wait.",
    });

    try {
      const folder = isImage ? 'contentImages' : 'contentPdfs';
      const path = `${folder}/${user.uid}/${Date.now()}_${file.name}`;
      const downloadURL = await uploadFile(file, path);

      currentToast.update({ id: currentToast.id, title: "Upload Complete", description: "Add details and save.", variant: "default" });

      setUploadedFile({ url: downloadURL, name: file.name, type: fileTypeForUpload });
    } catch (error: any) {
      currentToast.update({ id: currentToast.id, title: "Upload Failed", description: error.message || 'Could not upload file.', variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    if (e.target) e.target.value = ''; // Reset file input
  };
  const handleUploadAreaClick = () => { if (!isUploading && !uploadedFile) fileInputRef.current?.click(); };
  const clearUploadedFile = () => { setUploadedFile(null); };

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

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value);
  const handleAddTag = () => {
    if (tagInput.trim() && !currentTags.find(tag => tag.name.toLowerCase() === tagInput.trim().toLowerCase())) {
      setCurrentTags([...currentTags, { id: Date.now().toString(), name: tagInput.trim() }]);
    }
    setTagInput('');
  };
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag(); }
  };
  const removeTag = (tagToRemove: Tag) => setCurrentTags(currentTags.filter(tag => tag.id !== tagToRemove.id));
  const extractUrl = (text: string): string | null => {
    const words = text.split(/[\s\n]+/);
    for (const word of words) {
        try {
            if (word.startsWith('http://') || word.startsWith('https://')) {
                const url = new URL(word);
                return url.href;
            }
        } catch (_) { /* continue */ }
    }
    return null;
  };

  async function onSubmit(values: z.infer<typeof mainContentSchema>) {
    setIsSaving(true);
    const { mainContent, zoneId } = values;

    if (!uploadedFile && !mainContent.trim()) {
        form.setError("mainContent", { type: "manual", message: "Please drop a file or enter a link/note." });
        setIsSaving(false);
        return;
    }
    
    form.clearErrors('mainContent');

    let contentData: Partial<Omit<ContentItem, 'id' | 'createdAt'>>;

    if (uploadedFile) {
        const mindNoteFromInput = mainContent.trim() ? mainContent.trim() : undefined;
        contentData = uploadedFile.type === 'image'
        ? {
            type: 'image', title: uploadedFile.name, imageUrl: uploadedFile.url,
            mindNote: mindNoteFromInput,
            tags: [{id: 'upload', name: 'upload'}, ...currentTags], zoneId: zoneId || undefined, status: 'pending-analysis',
          }
        : {
            type: 'link', title: uploadedFile.name, url: uploadedFile.url, contentType: 'PDF',
            mindNote: mindNoteFromInput,
            domain: 'mati.internal.storage', tags: [{ id: 'upload', name: 'upload' }, ...currentTags],
            zoneId: zoneId || undefined, status: 'pending-analysis',
          };
    } else {
        const extractedUrl = extractUrl(mainContent);
        if (extractedUrl) {
            let metadata = { title: '', description: '', faviconUrl: '', imageUrl: '' };
            try {
                const response = await fetch(`/api/scrape-metadata?url=${encodeURIComponent(extractedUrl)}`);
                if (response.ok) { metadata = await response.json(); }
            } catch (e) { console.error("Failed to scrape metadata during content addition:", e); }
            if (!metadata.title) {
                try { metadata.title = new URL(extractedUrl).hostname.replace(/^www\./, ''); } 
                catch { metadata.title = "Untitled Link"; }
            }
            contentData = {
                type: 'link', url: extractedUrl, mindNote: mainContent, zoneId: zoneId || undefined,
                tags: currentTags, domain: new URL(extractedUrl).hostname.replace(/^www\./, ''),
                status: 'pending-analysis', title: metadata.title, description: metadata.description,
                faviconUrl: metadata.faviconUrl, imageUrl: metadata.imageUrl,
            };
        } else {
            const textContent = mainContent.trim();
            const generatedTitle = textContent.split(/\s+/).slice(0, 5).join(' ') + (textContent.split(/\s+/).length > 5 ? '...' : '');
            contentData = {
                type: 'note', title: generatedTitle || 'Untitled Note', description: textContent,
                zoneId: zoneId || undefined, tags: currentTags, contentType: 'Note', status: 'pending-analysis',
            };
        }
    }

    try {
        await onContentAdd(contentData as Omit<ContentItem, 'id' | 'createdAt'>);
        if (onOpenChange) onOpenChange(false);
    } catch (error) {
       // Handled by caller
    } finally {
        setIsSaving(false);
    }
  }

  const selectedZone = internalZones.find(z => z.id === watchedZoneId);
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon);
  const zoneDisplayName = selectedZone?.name || 'Select a zone';
  const filteredZones = zoneSearchText ? internalZones.filter(z => z.name.toLowerCase().includes(zoneSearchText.toLowerCase())) : internalZones;
  const isSubmitDisabled = isSaving || isUploading || (!uploadedFile && !watchedMainContent.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Add Content</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} id="add-content-form" className="flex-grow flex flex-col overflow-hidden">
          <div className="flex-grow overflow-y-auto pr-4 pl-1 space-y-4 py-4">
            
            <Textarea
              id="mainContent"
              {...form.register('mainContent')}
              placeholder="Paste a link, type a note, or add a thought..."
              className={cn("min-h-[100px] text-base focus-visible:ring-accent bg-muted/30", form.formState.errors.mainContent && "border-destructive focus-visible:ring-destructive")}
            />
            {form.formState.errors.mainContent && <p className="text-sm text-destructive">{form.formState.errors.mainContent.message}</p>}

            <div className="relative flex items-center pt-2">
              <div className="flex-grow border-t"></div>
              <span className="flex-shrink mx-4 text-xs uppercase text-muted-foreground">Or add by</span>
              <div className="flex-grow border-t"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                className={cn("relative flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed transition-colors h-full min-h-[110px]", 
                  isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                  isUploading || uploadedFile ? "cursor-default" : "cursor-pointer"
                )}
                onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                onClick={handleUploadAreaClick}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : uploadedFile ? (
                  <div className="flex items-center gap-3 w-full">
                      {uploadedFile.type === 'image' ? (
                          <ImageIcon className="h-8 w-8 text-primary shrink-0" />
                      ) : (
                          <FileIcon className="h-8 w-8 text-primary shrink-0" />
                      )}
                      <div className="text-left flex-grow truncate">
                          <p className="font-medium truncate text-sm">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">{uploadedFile.type === 'image' ? 'Image ready' : 'PDF ready'}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={clearUploadedFile}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <FileUp className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">Upload File</p>
                    <p className="text-xs text-muted-foreground">Image or PDF</p>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept="image/*,application/pdf" className="hidden" />

              <Button
                type="button"
                variant="secondary"
                className="h-full min-h-[110px] flex-col items-center justify-center p-4 transition-colors hover:bg-primary hover:text-primary-foreground"
                onClick={handleRecordVoiceClick}
              >
                <Mic className="h-8 w-8" />
                <p className="mt-2 text-sm font-medium">Record Voice</p>
              </Button>
            </div>
            
            <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
              <div className="space-y-2">
                <Label htmlFor="zoneId">Zone</Label>
                 <Popover open={isZonePopoverOpen} onOpenChange={setIsZonePopoverOpen}>
                  <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isZonePopoverOpen}
                          className={cn("w-full justify-between bg-background", !watchedZoneId && "text-muted-foreground", form.formState.errors.zoneId && "border-destructive")}>
                          <div className="flex items-center"><ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" /><span className="truncate">{zoneDisplayName}</span></div>
                          <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                          <CommandInput placeholder="Search or create zone..." value={zoneSearchText} onValueChange={setZoneSearchText} />
                          <CommandList>
                              <CommandEmpty>
                                <div className="py-6 text-center text-sm">{zoneSearchText.trim() === '' ? 'No zones found.' : 'No matching zones found.'}</div>
                              </CommandEmpty>
                              <CommandGroup>
                                  {filteredZones.map((z) => {
                                    const ListItemIcon = getIconComponent(z.icon);
                                    return (
                                      <CommandItem key={z.id} value={z.id} onSelect={() => { form.setValue('zoneId', z.id, { shouldTouch: true, shouldValidate: true }); setIsZonePopoverOpen(false); }}>
                                          <Check className={cn("mr-2 h-4 w-4", watchedZoneId === z.id ? "opacity-100" : "opacity-0")} />
                                          <ListItemIcon className="mr-2 h-4 w-4 opacity-70" />
                                          {z.name}
                                      </CommandItem>
                                    );
                                  })}
                              </CommandGroup>
                              {zoneSearchText.trim() !== '' && !filteredZones.some(z => z.name.toLowerCase() === zoneSearchText.trim().toLowerCase()) && (
                                <CommandGroup className="border-t">
                                  <CommandItem onSelect={() => handleCreateZone(zoneSearchText)} className="text-primary hover:!bg-primary/10 cursor-pointer justify-start">
                                      <Plus className="mr-2 h-4 w-4" /><span>Create "{zoneSearchText.trim()}"</span>
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
                      <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 focus:outline-none rounded-full hover:bg-destructive/20 p-0.5"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
                <Input id="tags" value={tagInput} onChange={handleTagInputChange} onKeyDown={handleTagInputKeyDown} placeholder="Add tags (press Enter or ,)" className="focus-visible:ring-accent bg-background" />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t mt-auto flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { if (onOpenChange) onOpenChange(false); }}>Cancel</Button>
            <Button type="submit" form="add-content-form" disabled={isSubmitDisabled} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {(isSaving || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? 'Uploading...' : isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialog;
