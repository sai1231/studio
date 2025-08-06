

'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, Check, Plus, ChevronDown, Bookmark, Briefcase, Home, Library, FileUp, UploadCloud, Mic, AlarmClock, Maximize, Image as ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { Zone, ContentItem, Tag } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/DialogContext';
import { add } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { classifyUrl } from '@/services/classifierService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import PdfIcon from './PdfIcon';

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
  onZoneCreate: (zoneName: string) => Promise<Zone | null>;
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


const AddContentDialog: React.FC<AddContentDialogProps> = ({ open, onOpenChange, zones, onContentAdd, onZoneCreate, children }) => {
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { setIsAddContentDialogOpen, setIsRecordVoiceDialogOpen, openFocusMode } = useDialog();

  const [internalZones, setInternalZones] = useState<Zone[]>(zones);
  const [isZonePopoverOpen, setIsZonePopoverOpen] = useState(false);
  const [zoneSearchText, setZoneSearchText] = useState('');

  const [uploadedFiles, setUploadedFiles] = useState<{name: string, type: 'image' | 'pdf', url: string}[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiryDays, setExpiryDays] = useState('30');
  
  const isMobile = useIsMobile();

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
      setUploadedFiles([]);
      setIsUploading(false);
      setIsTemporary(false);
      setExpiryDays('30');
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
  
  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (!user) return;
    
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    setIsUploading(true);
    form.clearErrors('mainContent');

    const uploadPromises = files.map(async (file) => {
      
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: `File Too Large: ${file.name}`, description: "File size cannot exceed 5 MB.", variant: "destructive" });
        return null;
      }
      
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      if (!isImage && !isPdf) {
        toast({ title: `Unsupported File: ${file.name}`, description: "You can only upload images or PDF files.", variant: "destructive" });
        return null;
      }

      const fileTypeForUpload = isImage ? 'image' : 'pdf';
      const currentToast = toast({
        title: `Uploading ${file.name}...`,
        description: "Please wait.",
      });

      try {
        const folder = isImage ? 'contentImages' : 'contentPdfs';
        const path = `${folder}/${user.uid}/${Date.now()}_${file.name}`;
        const downloadUrl = await uploadFile(file, path);
        
        currentToast.update({ id: currentToast.id, title: "Upload Complete", description: `"${file.name}" is ready to be saved.` });

        return { name: file.name, type: fileTypeForUpload, url: downloadUrl };

      } catch (error: any) {
        currentToast.update({ id: currentToast.id, title: `Upload Failed for ${file.name}`, description: error.message || 'Could not upload file.', variant: "destructive" });
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((r): r is {name: string, type: 'image' | 'pdf', url: string} => r !== null);

    setUploadedFiles(prev => [...prev, ...successfulUploads]);
    
    setIsUploading(false);
  }, [user, toast, form]);

  const handleUploadAreaClick = () => { if (!isUploading) fileInputRef.current?.click(); };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelected(Array.from(files));
      e.target.value = ''; // Reset input to allow re-selecting the same file
    }
  };

  const clearUploadedFile = (urlToRemove: string) => { 
    setUploadedFiles(prev => prev.filter(f => f.url !== urlToRemove));
  };

  const handleCreateZone = async (zoneName: string) => {
    if (!zoneName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const newZone = await onZoneCreate(zoneName);
      if (newZone) {
          form.setValue('zoneId', newZone.id, { shouldTouch: true, shouldValidate: true });
      }
    } catch(e) {
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
            // Check for common image file extensions
            if (/\.(jpg|jpeg|png|gif|webp)$/i.test(word)) {
                const url = new URL(word);
                return url.href;
            }
            if (word.startsWith('http://') || word.startsWith('https://')) {
                const url = new URL(word);
                return url.href;
            }
        } catch (_) { /* continue */ }
    }
    return null;
  };
  
  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(new URL(url).pathname);

  async function onSubmit(values: z.infer<typeof mainContentSchema>) {
    setIsSaving(true);
    const { mainContent, zoneId } = values;

    if (uploadedFiles.length === 0 && !mainContent.trim()) {
        form.setError("mainContent", { type: "manual", message: "Please drop a file or enter a link/note." });
        setIsSaving(false);
        return;
    }
    
    form.clearErrors('mainContent');

    let expiresAtDate: Date | undefined = undefined;
    if (isTemporary) {
      expiresAtDate = add(new Date(), { days: parseInt(expiryDays, 10) });
    }

    const commonData = {
      tags: currentTags,
      zoneIds: zoneId ? [zoneId] : [],
      expiresAt: expiresAtDate ? expiresAtDate.toISOString() : undefined,
    };

    if (uploadedFiles.length > 0) {
        const memoryNoteFromInput = mainContent.trim() ? mainContent.trim() : undefined;
        
        for (const uploadedFile of uploadedFiles) {
            const contentData = uploadedFile.type === 'image'
            ? {
                type: 'image' as const, title: uploadedFile.name, imageUrl: uploadedFile.url,
                memoryNote: memoryNoteFromInput, status: 'pending-analysis' as const,
                ...commonData
              }
            : {
                type: 'link' as const, title: uploadedFile.name, url: uploadedFile.url, contentType: 'PDF',
                memoryNote: memoryNoteFromInput, domain: 'mati.internal.storage',
                status: 'pending-analysis' as const,
                ...commonData
              };
            
            onContentAdd(contentData);
        }
    } else {
        const extractedUrl = extractUrl(mainContent);
        let contentData: Partial<Omit<ContentItem, 'id' | 'createdAt'>>;
        if (extractedUrl) {
            if (isImageUrl(extractedUrl)) {
                 const currentToast = toast({ title: 'Importing Image...', description: 'Please wait while we download the image.' });
                 try {
                     const response = await fetch(extractedUrl);
                     const blob = await response.blob();
                     const filename = new URL(extractedUrl).pathname.split('/').pop() || `image-${Date.now()}`;
                     const file = new File([blob], filename, { type: blob.type });

                     if (!user) throw new Error("User not authenticated for image upload.");
                     
                     const path = `contentImages/${user.uid}/${Date.now()}_${file.name}`;
                     const downloadUrl = await uploadFile(file, path);
                     
                     contentData = {
                         type: 'image', title: file.name, imageUrl: downloadUrl,
                         status: 'pending-analysis',
                         ...commonData
                     };
                     onContentAdd(contentData as Omit<ContentItem, 'id' | 'createdAt'>);
                     currentToast.update({ id: currentToast.id, title: "Image Imported", description: "The image was successfully saved to your collection." });
                 } catch (e) {
                     console.error("Failed to import image from URL:", e);
                     toast({ title: "Image Import Failed", description: "Could not save the image from the provided URL. Saving as a regular link.", variant: "destructive" });
                     contentData = { type: 'link', url: extractedUrl, status: 'pending-analysis', ...commonData };
                     onContentAdd(contentData as Omit<ContentItem, 'id' | 'createdAt'>);
                 }
            } else {
                let metadata = { title: '', description: '', faviconUrl: '', imageUrl: '' };
                try {
                    const response = await fetch(`/api/scrape-metadata?url=${encodeURIComponent(extractedUrl)}`);
                    if (response.ok) { metadata = await response.json(); }
                } catch (e) { console.error("Failed to scrape metadata during content addition:", e); }
                if (!metadata.title) {
                    try { metadata.title = new URL(extractedUrl).hostname.replace(/^www\./, ''); } 
                    catch { metadata.title = "Untitled Link"; }
                }
    
                const determinedContentType = await classifyUrl(extractedUrl);
                
                contentData = {
                    type: 'link', url: extractedUrl, memoryNote: mainContent,
                    domain: new URL(extractedUrl).hostname.replace(/^www\./, ''),
                    status: 'pending-analysis', title: metadata.title, description: metadata.description,
                    faviconUrl: metadata.faviconUrl, imageUrl: metadata.imageUrl,
                    contentType: determinedContentType,
                    ...commonData
                };
                onContentAdd(contentData as Omit<ContentItem, 'id' | 'createdAt'>);
            }
        } else {
            const textContent = mainContent.trim();
            const generatedTitle = textContent.split(/\s+/).slice(0, 5).join(' ') + (textContent.split(/\s+/).length > 5 ? '...' : '');
            contentData = {
                type: 'note', title: generatedTitle || 'Untitled Note', description: textContent,
                contentType: 'Note', status: 'pending-analysis',
                ...commonData
            };
            onContentAdd(contentData as Omit<ContentItem, 'id' | 'createdAt'>);
        }
    }

    if (onOpenChange) onOpenChange(false);
    setIsSaving(false);
  }
  
  const handleFocusModeClick = () => {
    setIsAddContentDialogOpen(false);
    openFocusMode(null);
  };

  const selectedZone = internalZones.find(z => z.id === watchedZoneId);
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon);
  const zoneDisplayName = selectedZone?.name || 'Select a zone';
  
  const isSubmitDisabled = isSaving || isUploading || (uploadedFiles.length === 0 && !watchedMainContent.trim());

  const filteredZones = zoneSearchText ? internalZones.filter(z => z.name.toLowerCase().includes(zoneSearchText.toLowerCase())) : internalZones;
  const showCreateZoneOption = zoneSearchText.trim() !== '' && !internalZones.some(z => z.name.toLowerCase() === zoneSearchText.trim().toLowerCase());

  const handleZoneInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        if (showCreateZoneOption) {
            handleCreateZone(zoneSearchText);
        }
    }
  };


  if (isMobile === undefined) {
    return null; // Avoid rendering anything until we know the screen size
  }
  
  const FormFields = (
    <div className="space-y-4 py-4">
      <div className="relative">
          <Textarea
              id="mainContent"
              {...form.register('mainContent')}
              placeholder="Paste a link, type a note, or add a thought for your uploads..."
              className={cn("min-h-[120px] text-base focus-visible:ring-accent bg-muted/50 pb-12", form.formState.errors.mainContent && "border-destructive focus-visible:ring-destructive")}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:bg-primary hover:text-primary-foreground h-8 w-8" onClick={handleUploadAreaClick} disabled={isUploading}>
                        <ImageIcon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Upload Image or PDF</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:bg-primary hover:text-primary-foreground h-8 w-8" onClick={handleRecordVoiceClick}>
                        <Mic className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Record Voice Note</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:bg-primary hover:text-primary-foreground h-8 w-8" onClick={handleFocusModeClick}>
                      <Maximize className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Focus Mode</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </div>
      </div>
      
       {uploadedFiles.length > 0 && (
          <ScrollArea className="w-full max-h-32">
          <div className="space-y-2 p-1">
              {uploadedFiles.map(file => (
              <div key={file.url} className="flex items-center gap-3 w-full bg-muted/50 p-2 rounded-md border">
                  {file.type === 'image' ? <ImageIcon className="h-6 w-6 text-primary shrink-0" /> : <PdfIcon className="h-6 w-6 shrink-0" />}
                  <div className="text-left flex-grow truncate">
                      <p className="font-medium truncate text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.type === 'image' ? 'Image ready' : 'PDF ready'}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); clearUploadedFile(file.url); }}><X className="h-4 w-4" /></Button>
              </div>
              ))}
          </div>
          </ScrollArea>
      )}


      {form.formState.errors.mainContent && <p className="text-sm text-destructive">{form.formState.errors.mainContent.message}</p>}

      <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept="image/*,application/pdf" className="hidden" multiple />



      <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
              <div className="flex items-center justify-between">
                  <Label htmlFor="temporary" className="flex items-center gap-2 font-medium">
                      <AlarmClock className="h-4 w-4" />
                      Temporary Content
                  </Label>
                  <Switch id="temporary" checked={isTemporary} onCheckedChange={setIsTemporary} />
              </div>
              {isTemporary && (
                  <Select value={expiryDays} onValueChange={setExpiryDays}>
                      <SelectTrigger className="w-full bg-background focus:ring-accent">
                          <SelectValue placeholder="Select expiration period" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="7">Delete after 7 days</SelectItem>
                          <SelectItem value="30">Delete after 30 days</SelectItem>
                          <SelectItem value="90">Delete after 90 days</SelectItem>
                          <SelectItem value="365">Delete after 1 year</SelectItem>
                      </SelectContent>
                  </Select>
              )}
          </div>

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
                  <div className="flex items-center border-b px-3">
                      <Input
                          placeholder="Search or create zone..."
                          value={zoneSearchText}
                          onChange={(e) => setZoneSearchText(e.target.value)}
                          onKeyDown={handleZoneInputKeyDown}
                          className="h-9 w-full border-0 bg-transparent pl-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn("ml-2", !showCreateZoneOption && "hidden")}
                          onClick={() => handleCreateZone(zoneSearchText)}
                      >
                          Create
                      </Button>
                  </div>
                      <CommandList>
                           <CommandEmpty>No matching zones found.</CommandEmpty>
                           <CommandGroup>
                              {filteredZones.map((z) => {
                                const ListItemIcon = getIconComponent(z.icon);
                                return (
                                  <CommandItem key={z.id} value={z.name} onSelect={() => { form.setValue('zoneId', z.id, { shouldTouch: true, shouldValidate: true }); setIsZonePopoverOpen(false); }}>
                                      <Check className={cn("mr-2 h-4 w-4", watchedZoneId === z.id ? "opacity-100" : "opacity-0")} />
                                      <ListItemIcon className="mr-2 h-4 w-4 opacity-70" />
                                      {z.name}
                                  </CommandItem>
                                );
                              })}
                           </CommandGroup>
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
  );

  const DialogContainer = isMobile ? Sheet : Dialog;
  const DialogContentContainer = isMobile ? SheetContent : DialogContent;

  return (
    <>
      {children && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
      
      <DialogContainer open={open} onOpenChange={onOpenChange}>
            <DialogContentContainer 
              className={cn(isMobile ? "flex flex-col p-0 bg-background" : "max-w-[625px] flex flex-col p-0 bg-card")}
              {...(isMobile ? { side: 'bottom' } : {})}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <SheetHeader className="p-4 border-b flex-shrink-0">
                    <SheetTitle className="font-headline">Add Content</SheetTitle>
                </SheetHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} id="add-content-form-desktop" className="flex-1 flex flex-col min-h-0">
                    <div className="flex-grow min-h-0 px-6">
                        <ScrollArea className={cn(isMobile ? "h-[65vh]" : "h-full pr-6 -mr-6")}>
                            {FormFields}
                        </ScrollArea>
                    </div>
                    <DialogFooter className="px-6 pb-6 pt-4 border-t flex-shrink-0">
                      <Button type="button" variant="outline" onClick={() => { if (onOpenChange) onOpenChange(false); }}>Cancel</Button>
                      <Button type="submit" form="add-content-form-desktop" disabled={isSubmitDisabled} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      {(isSaving || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isUploading ? 'Uploading...' : isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </DialogFooter>
                </form>
            </DialogContentContainer>
        </DialogContainer>
    </>
  );
};

export default AddContentDialog;
