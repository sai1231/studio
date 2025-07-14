

'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getContentItemById, updateContentItem, getZones, addZone, deleteContentItem } from '@/services/contentService';
import type { ContentItem, Zone, Tag, MovieDetails } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CalendarDays, ExternalLink, StickyNote, Plus, X, Loader2, Check, Edit3, Globe, Bookmark, Pencil, ChevronDown, Ban, Briefcase, Home, Library, Star, Film, Users, Clapperboard, Glasses, AlarmClock, Sparkles, Eye, ChevronsUpDown, Palette, Trash2, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { format, add, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '../ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const NO_ZONE_VALUE = "__NO_ZONE__";

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
      };
    };
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase,
  Home,
  Library,
  Bookmark,
  Ban,
};

const getIconComponent = (iconName?: string): React.ElementType => {
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }
  return Bookmark; // Default icon
};

const TruncatedDescription: React.FC<{ text: string }> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPotentiallyTruncated = text.split('\n').length > 4 || text.length > 250;

  if (!text) {
    return <p className="text-sm text-muted-foreground italic">No description available.</p>;
  }

  return (
    <div className="prose dark:prose-invert prose-sm max-w-none text-muted-foreground relative">
       <div 
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: isExpanded ? '1000px' : '80px' }} // 80px is approx 4 lines
       >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      {isPotentiallyTruncated && !isExpanded && (
        <Button variant="link" onClick={() => setIsExpanded(true)} className="p-0 h-auto text-primary mt-1">
          Show more
        </Button>
      )}
    </div>
  );
};


interface ContentDetailDialogProps {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdate?: (updatedItem: ContentItem) => void;
  onItemDelete?: (itemId: string) => void;
}

export default function ContentDetailDialog({ item: initialItem, open, onOpenChange, onItemUpdate, onItemDelete }: ContentDetailDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [item, setItem] = useState<ContentItem | null>(initialItem);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editableTitle, setEditableTitle] = useState('');
  const [editableMindNote, setEditableMindNote] = useState('');
  const [editableZoneId, setEditableZoneId] = useState<string | undefined>(undefined);

  const [allZones, setAllZones] = useState<Zone[]>([]);

  const [editableTags, setEditableTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [comboboxSearchText, setComboboxSearchText] = useState('');

  const [oembedHtml, setOembedHtml] = useState<string | null>(null);
  const [isFetchingOembed, setIsFetchingOembed] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [isTemporary, setIsTemporary] = useState(false);
  const [expirySelection, setExpirySelection] = useState<string>('30');
  const [customExpiryDays, setCustomExpiryDays] = useState<string>('30');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (open && initialItem) {
      setItem(initialItem); 
      setIsLoading(false); 
      setError(null);
      setOembedHtml(null);

      const fetchSupportingData = async () => {
        if (!initialItem.userId) {
          setError("Item is missing user information.");
          return;
        }
        try {
          const freshItemPromise = getContentItemById(initialItem.id);
          const zonesPromise = getZones(initialItem.userId);
          
          const [freshItem, fetchedZones] = await Promise.all([freshItemPromise, zonesPromise]);
          
          if (freshItem) {
            setItem(freshItem); 
          }
          setAllZones(fetchedZones);
          
          if (initialItem.type === 'link' && initialItem.url && initialItem.contentType !== 'PDF') {
            setIsFetchingOembed(true);
            try {
              const oembedRes = await fetch(`/api/oembed?url=${encodeURIComponent(initialItem.url)}`);
              if (oembedRes.ok) {
                const oembedData = await oembedRes.json();
                if (oembedData.html) setOembedHtml(oembedData.html);
              }
            } catch (e) {
              console.error("Failed to fetch oEmbed data", e);
            } finally {
              setIsFetchingOembed(false);
            }
          }
        } catch (e) {
          console.error('Error fetching supporting details for dialog:', e);
          setError('Failed to load fresh details.');
        }
      };

      fetchSupportingData();

    } else if (!open) {
      setItem(null);
      setIsLoading(true); 
      setError(null);
      setOembedHtml(null);
    }
  }, [initialItem, open]); 

  useEffect(() => {
    if (item) {
      setEditableTitle(item.title);
      setEditableMindNote(item.mindNote || '');
      setEditableZoneId(item.zoneId);
      setEditableTags(item.tags || []);
      setIsTemporary(!!item.expiresAt);
      setImageError(false);
    }
  }, [item]);

  useEffect(() => {
    if (oembedHtml) {
      if (oembedHtml.includes('twitter-tweet') && window.twttr) {
        window.twttr.widgets.load();
      }
      if (oembedHtml.includes('instagram-media') && window.instgrm) {
        window.instgrm.Embeds.process();
      }
    }
  }, [oembedHtml]);

  useEffect(() => {
    if (isAddingTag && newTagInputRef.current) {
      newTagInputRef.current.focus();
    }
  }, [isAddingTag]);
  
  const handleDelete = async () => {
    if (!item || !onItemDelete) return;
    onItemDelete(item.id);
    onOpenChange(false); // Close main dialog after confirming delete
  };

  const handleFieldUpdate = useCallback(async (
    fieldName: keyof Pick<ContentItem, 'title' | 'mindNote' | 'zoneId' | 'expiresAt' | 'tags'>,
    value: any
  ) => {
    if (!item) return;
    setIsSaving(true);
    const previousValue = item[fieldName];
    
    const updatedItem = { ...item, [fieldName]: value };
    setItem(updatedItem);
    if (onItemUpdate) {
        onItemUpdate(updatedItem);
    }
    
    try {
        await updateContentItem(item.id, { [fieldName]: value });
    } catch (e) {
        console.error(`Error updating ${fieldName}:`, e);
        const revertedItem = { ...item, [fieldName]: previousValue };
        setItem(revertedItem);
        if (onItemUpdate) {
            onItemUpdate(revertedItem);
        }
        toast({
            title: 'Update Failed',
            description: `Could not save your changes for ${fieldName}.`,
            variant: 'destructive',
        });
    } finally {
        setIsSaving(false);
    }
  }, [item, onItemUpdate, toast]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableTitle(e.target.value);
  };
  const handleTitleBlur = () => {
    if (item && editableTitle !== item.title) {
      handleFieldUpdate('title', editableTitle);
    }
  };

  const handleMindNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableMindNote(e.target.value);
  };
  const handleMindNoteBlur = () => {
    if (item && editableMindNote !== (item.mindNote || '')) {
      handleFieldUpdate('mindNote', editableMindNote);
    }
  };

  const handleZoneSelection = async (selectedZoneValue: string | undefined) => {
    setIsComboboxOpen(false);
    setComboboxSearchText('');
    const newZoneId = selectedZoneValue === NO_ZONE_VALUE ? undefined : selectedZoneValue;
    if (item && item.zoneId !== newZoneId) {
        await handleFieldUpdate('zoneId', newZoneId);
    }
    setEditableZoneId(newZoneId);
  };

  const handleCreateZone = async (zoneName: string) => {
    if (!zoneName.trim() || !user) return;
    setIsSaving(true);
    try {
      const newZone = await addZone(zoneName.trim(), user.uid);
      setAllZones(prev => [...prev, newZone]); 
      await handleFieldUpdate('zoneId', newZone.id);
      setEditableZoneId(newZone.id);
      toast({ title: "Zone Created", description: `Zone "${newZone.name}" created and assigned.` });
    } catch (e) {
      console.error('Error creating zone:', e);
      toast({ title: "Error", description: "Could not create new zone.", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setIsComboboxOpen(false);
      setComboboxSearchText('');
    }
  };


  const saveTags = (tagsToSave: Tag[]) => {
    handleFieldUpdate('tags', tagsToSave);
  };

  const handleRemoveTag = (tagIdToRemove: string) => {
    const newTags = editableTags.filter(tag => tag.id !== tagIdToRemove);
    setEditableTags(newTags); 
    saveTags(newTags);
  };

  const handleAddNewTag = () => {
    if (newTagInput.trim() === '') {
      toast({ title: "Empty Tag", description: "Tag name cannot be empty.", variant: "destructive" });
      return;
    }
    if (editableTags.find(tag => tag.name.toLowerCase() === newTagInput.trim().toLowerCase())) {
      toast({ title: "Duplicate Tag", description: `Tag "${newTagInput.trim()}" already exists.`, variant: "destructive" });
      setNewTagInput(''); 
      return;
    }
    const newTag: Tag = { id: newTagInput.trim().toLowerCase(), name: newTagInput.trim() }; 
    const newTags = [...editableTags, newTag];
    
    setEditableTags(newTags); 
    setNewTagInput('');
    setIsAddingTag(false);
    saveTags(newTags);
  };

  const handleTagInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddNewTag();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleCancelAddTag = () => {
    setNewTagInput('');
    setIsAddingTag(false);
  }
  
  const handleTemporaryToggle = (checked: boolean) => {
      setIsTemporary(checked);
      if (checked) {
          const days = parseInt(expirySelection === 'custom' ? customExpiryDays : expirySelection, 10);
          const newExpiryDate = add(new Date(), { days: isNaN(days) ? 30 : days });
          handleFieldUpdate('expiresAt', newExpiryDate.toISOString());
      } else {
          handleFieldUpdate('expiresAt', undefined);
      }
  };
  
  const handleExpiryChange = (value: string) => {
    setExpirySelection(value);
    if (value !== 'custom') {
      const newExpiryDate = add(new Date(), { days: parseInt(value, 10) });
      handleFieldUpdate('expiresAt', newExpiryDate.toISOString());
    }
  };

  const handleCustomExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = e.target.value;
    setCustomExpiryDays(days);
    const numDays = parseInt(days, 10);
    if (!isNaN(numDays) && numDays > 0) {
      const newExpiryDate = add(new Date(), { days: numDays });
      handleFieldUpdate('expiresAt', newExpiryDate.toISOString());
    }
  };
    
  const selectedZone = allZones.find(z => z.id === editableZoneId);
  const zoneDisplayName = selectedZone?.name || "No zone";
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon);
  const filteredZones = comboboxSearchText ? allZones.filter(z => z.name.toLowerCase().includes(comboboxSearchText.toLowerCase())) : allZones;
  
  const showCreateZoneButton = comboboxSearchText.trim() !== '' && !allZones.some(z => z.name.toLowerCase() === comboboxSearchText.trim().toLowerCase());

  const handleZoneInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showCreateZoneButton) {
        handleCreateZone(comboboxSearchText);
      }
    }
  };

  const hasVisual = !imageError && (item?.imageUrl || oembedHtml);

  const ColorPalette = ({ palette }: { palette: string[] | undefined }) => {
    if (!palette || palette.length === 0) {
      return null;
    }
    
    const handleColorCopy = (color: string) => {
      navigator.clipboard.writeText(color);
      toast({
        title: "Color Copied!",
        description: (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: color }} />
            <span>{color} has been copied to your clipboard.</span>
          </div>
        )
      });
    };
  
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Color Palette</h3>
        </div>
        <div className="flex items-center gap-2 pt-2">
          {palette.slice(0, 10).map((color, index) => (
            <TooltipProvider key={`${color}-${index}`} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="h-6 w-6 rounded-full border shadow-inner transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:z-10"
                    style={{ backgroundColor: color }}
                    aria-label={`Copy color ${color}`}
                    onClick={() => handleColorCopy(color)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: color }} />
                    <p className="font-mono text-xs">{color}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    );
  };
  
  const DialogBody = (
    <>
      <DialogTitle className="sr-only">Details for {item?.title || 'content item'}</DialogTitle>
      <div className={cn(
        "grid flex-grow overflow-hidden",
        hasVisual ? "md:grid-cols-2" : "md:grid-cols-1"
      )}>
        {hasVisual && (
          <div className="hidden md:flex flex-col bg-muted/50">
              <div className="relative w-full flex-grow min-h-0 flex justify-center items-center rounded-lg overflow-hidden">
                  {isFetchingOembed ? (
                  <div className="w-full aspect-video flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                  ) : oembedHtml ? (
                  <div className="oembed-container w-full" dangerouslySetInnerHTML={{ __html: oembedHtml }} />
                  ) : item?.imageUrl && !imageError ? (
                      <img src={item.imageUrl} alt={editableTitle || 'Content Image'} data-ai-hint={item.title || "image"} className="w-full h-full object-contain" loading="lazy" onError={() => setImageError(true)}/>
                  ) : (item?.type === 'link' && item?.contentType === 'PDF' && item?.url) ? (
                      <iframe src={item.url} className="w-full h-full min-h-[70vh] rounded-xl border-0" title={editableTitle || 'PDF Preview'}></iframe>
                  ) : null}
              </div>
          </div>
        )}
        <div className={cn(
          "flex flex-col bg-card text-card-foreground shadow-lg overflow-hidden relative",
          !hasVisual && "md:col-span-2"
        )}>
            <ScrollArea className="flex-grow">
              <div className="p-6 space-y-4">
                {item?.domain && item.domain !== 'mati.internal.storage' && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Globe className="h-4 w-4 mr-2" />
                        <span>{item.domain}</span>
                        {(item.type === 'link' || item.type === 'movie') && item.url && (
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1 ml-1.5 text-primary hover:text-primary/80" title={`Open link: ${item.url}`}>
                                    <ExternalLink className="h-4 w-4" />
                                    </a>
                                </TooltipTrigger>
                                <TooltipContent><p>Open link</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                )}
                <Input
                    value={editableTitle}
                    onChange={handleTitleChange}
                    onBlur={handleTitleBlur}
                    className="text-2xl font-headline font-semibold border-0 focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-0 shadow-none p-0 h-auto flex-grow bg-transparent"
                    placeholder="Enter title"
                />
                <Separator />
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Description</h3>
                  </div>
                  <TruncatedDescription text={item?.description || ''} />
                </div>

                <Separator />
                
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Pencil className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">Mind Note</h3>
                    </div>
                    <Textarea
                    value={editableMindNote}
                    onChange={handleMindNoteChange}
                    onBlur={handleMindNoteBlur}
                    placeholder="Add your personal thoughts..."
                    className="w-full min-h-[120px] focus-visible:ring-accent bg-muted/30 dark:bg-muted/20 border-border"
                    />
                </div>

                {item?.colorPalette && item.colorPalette.length > 0 && (
                  <ColorPalette palette={item?.colorPalette} />
                )}

                <Separator />

                <div className="space-y-4">
                    <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isComboboxOpen} className={cn("w-full justify-between", isSaving ? "opacity-50" : "", !editableZoneId && "text-muted-foreground")} disabled={isSaving}>
                                <div className="flex items-center"><ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" /><span className="truncate">{zoneDisplayName}</span></div><ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><div className="flex items-center border-b px-3"><Input placeholder="Search or create zone..." value={comboboxSearchText} onChange={(e) => setComboboxSearchText(e.target.value)} onKeyDown={handleZoneInputKeyDown} className="h-9 w-full border-0 bg-transparent pl-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" /><Button variant="ghost" size="sm" className={cn("ml-2", !showCreateZoneButton && "hidden")} onClick={() => handleCreateZone(comboboxSearchText)}>Create</Button></div><CommandList><CommandEmpty>No matching zones found.</CommandEmpty><CommandGroup><CommandItem value={NO_ZONE_VALUE} onSelect={() => handleZoneSelection(undefined)}><Check className={cn("mr-2 h-4 w-4", !editableZoneId ? "opacity-100" : "opacity-0")} /><Ban className="mr-2 h-4 w-4 opacity-70 text-muted-foreground" />No Zone Assigned</CommandItem>{filteredZones.map((z) => {const ListItemIcon = getIconComponent(z.icon);return (<CommandItem key={z.id} value={z.id} onSelect={(currentValue) => {handleZoneSelection(currentValue === editableZoneId ? undefined : currentValue);}}><Check className={cn("mr-2 h-4 w-4", editableZoneId === z.id ? "opacity-100" : "opacity-0")} /><ListItemIcon className="mr-2 h-4 w-4 opacity-70" />{z.name}</CommandItem>);})}</CommandGroup></CommandList></Command></PopoverContent>
                    </Popover>

                    <div className="flex flex-wrap items-center gap-2">
                        <Label className="text-sm font-medium mr-2">Tags:</Label>
                        {editableTags.map(tag => (<Badge key={tag.id} variant="secondary" className="px-3 py-1 text-sm rounded-full font-medium group relative">{tag.name}<Button variant="ghost" size="icon" className="h-5 w-5 ml-1.5 p-0.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive absolute -right-1.5 -top-1.5 rounded-full bg-background/50" onClick={() => handleRemoveTag(tag.id)} aria-label={`Remove tag ${tag.name}`}><X className="h-3 w-3" /></Button></Badge>))}
                        {isAddingTag ? (<div className="flex items-center gap-1"><Input ref={newTagInputRef} value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} placeholder="New tag" onKeyDown={handleTagInputKeyDown} className="h-8 text-sm w-32 focus-visible:ring-accent" autoFocus /><Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAddNewTag} disabled={newTagInput.trim() === ''} aria-label="Confirm add tag" ><Check className="h-4 w-4 text-green-600" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelAddTag} aria-label="Cancel add tag" ><X className="h-4 w-4 text-destructive" /></Button></div>) : (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => setIsAddingTag(true)} aria-label="Add new tag" ><Plus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Add new tag</p></TooltipContent></Tooltip></TooltipProvider>)}
                    </div>
                </div>

                <Separator />
                
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between"><label htmlFor="temporary-switch" className="font-medium text-foreground">Temporary Memory</label><Switch id="temporary-switch" checked={isTemporary} onCheckedChange={handleTemporaryToggle} /></div>
                    {isTemporary && (
                        <div className="flex items-center gap-2">
                            <Select value={expirySelection} onValueChange={handleExpiryChange}>
                                <SelectTrigger className="flex-grow bg-background focus:ring-accent"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="7">Delete after 7 days</SelectItem>
                                <SelectItem value="30">Delete after 30 days</SelectItem>
                                <SelectItem value="90">Delete after 90 days</SelectItem>
                                <SelectItem value="custom">Custom...</SelectItem>
                                </SelectContent>
                            </Select>
                            {expirySelection === 'custom' && (
                            <div className="flex items-center gap-1.5">
                                <Input type="number" value={customExpiryDays} onChange={handleCustomExpiryChange} className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                <span className="text-sm text-muted-foreground">days</span>
                            </div>
                            )}
                        </div>
                    )}
                </div>

              </div>
            </ScrollArea>
        </div>
      </div>
      <div className="flex-shrink-0 flex justify-between items-center px-6 py-3 border-t">
        <div className="text-xs text-muted-foreground flex items-center">
            <CalendarDays className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            Saved {item && format(parseISO(item.createdAt), 'MMM d, yyyy @ h:mm a')}
        </div>
        <div className="flex items-center gap-2">
            {onItemDelete && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete "{item?.title}" and cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <DialogClose asChild>
                <Button variant="outline">Close</Button>
            </DialogClose>
        </div>
      </div>
    </>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className={cn(
        "p-0 border-0 shadow-2xl flex flex-col max-h-[90vh] bg-background rounded-lg",
        hasVisual ? "max-w-6xl w-[95vw]" : "max-w-2xl w-[95vw]"
      )}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full col-span-2 p-10 bg-card rounded-lg"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
        ) : error || !item ? (
          <div className="flex-grow flex items-center justify-center py-8 text-center h-full col-span-2 p-10 bg-card rounded-lg"><div><X className="h-12 w-12 mx-auto text-destructive mb-3" /><h2 className="text-xl font-semibold text-destructive">{error || 'Content Item Not Found'}</h2><p className="text-muted-foreground mt-1">Please try again or select another item.</p></div></div>
        ) : DialogBody}
      </DialogContent>
    </Dialog>
  );
}
