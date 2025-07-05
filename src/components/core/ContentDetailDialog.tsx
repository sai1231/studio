

'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getContentItemById, updateContentItem, getZones, addZone } from '@/services/contentService';
import type { ContentItem, Zone, Tag, MovieDetails } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, CalendarDays, ExternalLink, StickyNote, Plus, X, Loader2, Check, Edit3, Globe, Bookmark, Pencil, ChevronDown, Ban, Briefcase, Home, Library, Star, Film, Users, Clapperboard, Glasses, AlarmClock, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, add } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Separator } from '../ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';


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

const ColorPalette: React.FC<{ palette: string[] | undefined }> = ({ palette }) => {
  const { toast } = useToast();

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

  if (!palette || palette.length === 0) {
    return null;
  }

  return (
    <div className="pt-2">
      <div className="flex h-2.5 items-center gap-0 overflow-hidden rounded-full shadow-inner">
        {palette.slice(0, 10).map((color, index) => (
          <TooltipProvider key={`${color}-${index}`} delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="h-full w-full flex-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:z-10 rounded"
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


const loadingMessages = [
  "Organizing your thoughts...",
  "Fetching your inspirations...",
  "Aligning your ideas...",
  "Connecting the dots...",
  "Unpacking wisdom...",
  "Brewing brilliance...",
];

interface ContentDetailDialogProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdate?: (updatedItem: ContentItem) => void;
}

export default function ContentDetailDialog({ itemId, open, onOpenChange, onItemUpdate }: ContentDetailDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [item, setItem] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);

  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editableMindNote, setEditableMindNote] = useState('');
  const [editableZoneId, setEditableZoneId] = useState<string | undefined>(undefined);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);


  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [isSavingField, setIsSavingField] = useState(false);

  const [editableTags, setEditableTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [comboboxSearchText, setComboboxSearchText] = useState('');

  // oEmbed state
  const [oembedHtml, setOembedHtml] = useState<string | null>(null);
  const [isFetchingOembed, setIsFetchingOembed] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [isTemporary, setIsTemporary] = useState(false);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    
    if (open && itemId && user) {
      setIsLoading(true); 
      setError(null);
      setItem(null);
      setEditableTitle('');
      setEditableDescription('');
      setEditableMindNote('');
      setEditableZoneId(undefined);
      setEditableTags([]);
      setOembedHtml(null);
      setImageError(false);
      setIsDescriptionExpanded(false);
      setIsTemporary(false);
      
      const randomIndex = Math.floor(Math.random() * loadingMessages.length);
      setCurrentLoadingMessage(loadingMessages[randomIndex]);

      const fetchData = async () => {
        try {
          const fetchedItem = await getContentItemById(itemId);
          if (fetchedItem) {
            setItem(fetchedItem);
            setIsTemporary(!!fetchedItem.expiresAt);
            
            if (fetchedItem.status === 'pending-analysis') {
              pollingInterval = setInterval(async () => {
                const updatedItem = await getContentItemById(itemId);
                if (updatedItem && updatedItem.status !== 'pending-analysis') {
                  if (pollingInterval) clearInterval(pollingInterval);
                  setItem(updatedItem);
                  if (onItemUpdate) onItemUpdate(updatedItem);
                }
              }, 5000); // Poll every 5 seconds
            }

            if (fetchedItem.type === 'link' && fetchedItem.url) {
                setIsFetchingOembed(true);
                setOembedHtml(null);
                try {
                    const oembedRes = await fetch(`/api/oembed?url=${encodeURIComponent(fetchedItem.url)}`);
                    if (oembedRes.ok) {
                        const oembedData = await oembedRes.json();
                        if (oembedData.html) {
                            setOembedHtml(oembedData.html);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch oEmbed data", e);
                } finally {
                    setIsFetchingOembed(false);
                }
            }
          } else {
            setError('Content item not found.');
          }
        } catch (e) {
          console.error('Error fetching content details for dialog:', e);
          setError('Failed to load content details.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();

      const fetchAllZonesData = async () => {
        try {
            const fetchedZones = await getZones(user.uid);
            setAllZones(fetchedZones);
        } catch (e) {
            console.error("Failed to fetch zones for dropdown", e);
        }
      };
      fetchAllZonesData();
    } else if (!open) {
      setItem(null);
      setIsLoading(true); 
      setError(null);
      setOembedHtml(null);
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };

  }, [itemId, open, user, onItemUpdate]); 

  useEffect(() => {
    if (item) {
      setEditableTitle(item.title);
      setEditableDescription(item.description || '');
      setEditableMindNote(item.mindNote || '');
      setEditableZoneId(item.zoneId);
      setEditableTags(item.tags || []);
      setIsTemporary(!!item.expiresAt);
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

  const handleFieldUpdate = async (fieldName: keyof Pick<ContentItem, 'title' | 'description' | 'mindNote' | 'zoneId' | 'expiresAt'>, value: any) => {
    if (!item || isSavingField) return;
    setIsSavingField(true);

    try {
      let updatePayload: Partial<ContentItem> = { [fieldName]: value };
      const updatedItem = await updateContentItem(item.id, updatePayload);
      if (updatedItem) {
        setItem(updatedItem); 
        if (onItemUpdate) onItemUpdate(updatedItem); 
      } else {
        throw new Error(`Failed to update ${fieldName}.`);
      }
    } catch (e) {
      console.error(`Error updating ${fieldName}:`, e);
    } finally {
      setIsSavingField(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableTitle(e.target.value);
  };
  const handleTitleBlur = () => {
    if (item && editableTitle !== item.title) {
      handleFieldUpdate('title', editableTitle);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableDescription(e.target.value);
  };
  const handleDescriptionBlur = () => {
    if (item && editableDescription !== (item.description || '')) {
       if (item.type === 'note' || item.type === 'movie') {
         handleFieldUpdate('description', editableDescription);
       }
    }
  };

  const handleMindNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableMindNote(e.target.value);
  };
  const handleMindNoteBlur = () => {
    if (item && editableMindNote !== (item.mindNote || '')) {
      if (item.type === 'link' || item.type === 'image' || item.type === 'voice' || item.type === 'movie') {
        handleFieldUpdate('mindNote', editableMindNote);
      }
    }
  };

  const handleZoneSelection = async (selectedZoneValue: string | undefined) => {
    setIsComboboxOpen(false);
    setComboboxSearchText('');

    if (selectedZoneValue === undefined || selectedZoneValue === NO_ZONE_VALUE) {
      if (item && item.zoneId !== undefined) {
        await handleFieldUpdate('zoneId', undefined);
      }
      setEditableZoneId(undefined);
      return;
    }

    const existingZone = allZones.find(z => z.id === selectedZoneValue);
    if (existingZone) {
      if (item && item.zoneId !== existingZone.id) {
        await handleFieldUpdate('zoneId', existingZone.id);
      }
      setEditableZoneId(existingZone.id);
    }
  };

  const handleCreateZone = async (zoneName: string) => {
    if (!zoneName.trim() || !user) return;
    setIsSavingField(true);
    try {
      const newZone = await addZone(zoneName.trim(), user.uid);
      setAllZones(prev => [...prev, newZone]); 
      if (item) {
        await handleFieldUpdate('zoneId', newZone.id);
      }
      setEditableZoneId(newZone.id);
      toast({ title: "Zone Created", description: `Zone "${newZone.name}" created and assigned.` });
    } catch (e) {
      console.error('Error creating zone:', e);
      toast({ title: "Error", description: "Could not create new zone.", variant: "destructive" });
    } finally {
      setIsSavingField(false);
      setIsComboboxOpen(false);
      setComboboxSearchText('');
    }
  };


  const saveTags = async (tagsToSave: Tag[]) => {
    if (!item || isSavingField) return; 
    setIsUpdatingTags(true);
    try {
      const updatedItemWithTags = await updateContentItem(item.id, { tags: tagsToSave });
      if (updatedItemWithTags) {
        setItem(prevItem => prevItem ? { ...prevItem, tags: updatedItemWithTags.tags || [] } : null);
        if (onItemUpdate) onItemUpdate(updatedItemWithTags); 
      } else {
        throw new Error("Failed to update item tags.");
      }
    } catch (e) {
      console.error('Error updating tags:', e);
      if(item) setEditableTags(item.tags || []); 
    } finally {
      setIsUpdatingTags(false);
    }
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
          // Default to 30 days when toggled on
          const newExpiryDate = add(new Date(), { days: 30 });
          handleFieldUpdate('expiresAt', newExpiryDate.toISOString());
      } else {
          // Remove expiry when toggled off
          handleFieldUpdate('expiresAt', undefined);
      }
  };
  
  const handleExpiryChange = (value: string) => {
    const newExpiryDate = add(new Date(), { days: parseInt(value, 10) });
    handleFieldUpdate('expiresAt', newExpiryDate.toISOString());
  };
  
  const dialogTitleText = isLoading ? currentLoadingMessage : (item?.type === 'note' ? 'Note' : (item?.title || (error ? "Error Loading" : "Content Details")));

  if (!open) { 
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-7xl h-[95vh] max-h-[95vh] flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>{dialogTitleText}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto pr-4 pl-1 custom-scrollbar py-4">
            {isLoading ? (
              <div className="md:grid md:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)] gap-8">
                {/* Left Column Skeleton (Media) */}
                <div className="relative w-full overflow-hidden rounded-xl shadow-sm aspect-video">
                  <Skeleton className="h-full w-full" />
                </div>
                {/* Right Column Skeleton (Details) */}
                <div className="flex flex-col space-y-6 mt-6 md:mt-0">
                  <Skeleton className="h-7 w-3/4 rounded" /> {/* Title Skeleton */}
                  <Skeleton className="h-4 w-1/2 rounded" /> {/* Domain/Link Skeleton */}
                  <div className="space-y-2"> {/* Description Skeleton */}
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                  </div>
                  <Skeleton className="h-10 w-48 rounded" /> {/* Zone Selector Skeleton */}
                  <div className="flex flex-wrap gap-2"> {/* Tags Skeleton */}
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg mt-4"> {/* Mind Note Area Skeleton */}
                    <Skeleton className="h-5 w-1/3 mb-2 rounded" /> {/* Mind Note Title Skeleton */}
                    <Skeleton className="h-16 w-full rounded" /> {/* Mind Note Textarea Skeleton */}
                  </div>
                </div>
              </div>
            ) : error || !item ? (
              <div className="flex-grow flex items-center justify-center py-8 text-center">
                <div>
                  <X className="h-12 w-12 mx-auto text-destructive mb-3" />
                  <h2 className="text-xl font-semibold text-destructive">
                    {error || 'Content Item Not Found'}
                  </h2>
                  <p className="text-muted-foreground mt-1">Please try again or select another item.</p>
                </div>
              </div>
            ) : (
              // Main content area for the item details
              (() => { 
                const isDescriptionReadOnly = (item.type === 'link' && item.type !== 'movie') || item.type === 'image' || item.type === 'voice';
                const showMindNote = item.type === 'link' || item.type === 'image' || item.type === 'voice' || item.type === 'movie';
                const showMediaColumn = isFetchingOembed || oembedHtml || (item.imageUrl && !imageError && (item.type === 'link' || item.type === 'image' || item.type === 'note' || item.type === 'voice' || item.type === 'movie')) || (item.type === 'link' && item.contentType === 'PDF');
                const filteredZones = comboboxSearchText
                  ? allZones.filter(z => z.name.toLowerCase().includes(comboboxSearchText.toLowerCase()))
                  : allZones;
                const currentZoneObject = editableZoneId ? allZones.find(z => z.id === editableZoneId) : undefined;
                const ZoneDisplayIcon = getIconComponent(currentZoneObject?.icon);
                const zoneDisplayName = currentZoneObject?.name || "No Zone Assigned";
                const needsTruncation = editableDescription.length > 280;

                if (item.type === 'note') {
                  return (
                    <div className="space-y-6">
                      
                      <div className="md:grid md:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)] gap-8">
                        <div>
                          <Textarea
                              value={editableDescription}
                              onChange={handleDescriptionChange}
                              onBlur={handleDescriptionBlur}
                              disabled={isSavingField || isUpdatingTags}
                              placeholder="Enter description..."
                              className="w-full h-auto min-h-[400px] focus-visible:ring-accent font-mono bg-muted/30 dark:bg-muted/20"
                          />
                        </div>
                        <div className="flex flex-col space-y-5 mt-6 md:mt-0">
                            {/* Metadata items */}
                            <div className="space-y-3">
                               <div className="flex items-center space-x-2">
                                    <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" aria-expanded={isComboboxOpen} className={cn("w-auto justify-between text-sm min-w-[180px]", (isSavingField || isUpdatingTags) ? "opacity-50" : "", !editableZoneId && "text-muted-foreground")} disabled={isSavingField || isUpdatingTags}>
                                                <div className="flex items-center"><ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" /><span className="truncate">{zoneDisplayName}</span></div>
                                                <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command><CommandInput placeholder="Search or create zone..." value={comboboxSearchText} onValueChange={setComboboxSearchText} /><CommandList><CommandEmpty><div className="py-6 text-center text-sm">{comboboxSearchText.trim() === '' ? 'No zones found.' : 'No matching zones found.'}</div></CommandEmpty><CommandGroup><CommandItem value={NO_ZONE_VALUE} onSelect={() => handleZoneSelection(undefined)}><Check className={cn("mr-2 h-4 w-4", !editableZoneId ? "opacity-100" : "opacity-0")} /><Ban className="mr-2 h-4 w-4 opacity-70 text-muted-foreground" />No Zone Assigned</CommandItem>{filteredZones.map((z) => {const ListItemIcon = getIconComponent(z.icon);return (<CommandItem key={z.id} value={z.id} onSelect={(currentValue) => {handleZoneSelection(currentValue === editableZoneId ? undefined : currentValue);}}><Check className={cn("mr-2 h-4 w-4", editableZoneId === z.id ? "opacity-100" : "opacity-0")} /><ListItemIcon className="mr-2 h-4 w-4 opacity-70" />{z.name}</CommandItem>);})}</CommandGroup>{comboboxSearchText.trim() !== '' && !filteredZones.some(z => z.name.toLowerCase() === comboboxSearchText.trim().toLowerCase()) && (<CommandGroup className="border-t"><CommandItem onSelect={() => handleCreateZone(comboboxSearchText)} className="text-primary hover:!bg-primary/10 cursor-pointer"><Plus className="mr-2 h-4 w-4" /> Create "{comboboxSearchText.trim()}"</CommandItem></CommandGroup>)}</CommandList></Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                    {editableTags.map(tag => (<Badge key={tag.id} variant="secondary" className="px-3 py-1 text-xs rounded-full font-medium group relative">{tag.name}<Button variant="ghost" size="icon" className="h-5 w-5 ml-1.5 p-0.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive absolute -right-1 -top-1 rounded-full bg-background/50" onClick={() => handleRemoveTag(tag.id)} disabled={isUpdatingTags || isSavingField} aria-label={`Remove tag ${tag.name}`}><X className="h-3 w-3" /></Button></Badge>))}
                                    {isAddingTag ? (<div className="flex items-center gap-1"><Input ref={newTagInputRef} value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} placeholder="New tag" onKeyDown={handleTagInputKeyDown} disabled={isUpdatingTags || isSavingField} className="h-8 text-sm w-32 focus-visible:ring-accent" autoFocus /><Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAddNewTag} disabled={isUpdatingTags || isSavingField || newTagInput.trim() === ''} aria-label="Confirm add tag" ><Check className="h-4 w-4 text-green-600" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelAddTag} disabled={isUpdatingTags || isSavingField} aria-label="Cancel add tag" ><X className="h-4 w-4 text-destructive" /></Button></div>) : (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="icon" className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20" onClick={() => setIsAddingTag(true)} disabled={isUpdatingTags || isSavingField} aria-label="Add new tag" ><Plus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Add new tag</p></TooltipContent></Tooltip></TooltipProvider>)}
                                    {isUpdatingTags && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                    </div>
                                    {editableTags.length === 0 && !isAddingTag && !isUpdatingTags && (<p className="text-sm text-muted-foreground mt-2">No tags yet. Click '+' to add one.</p>)}
                                </div>
                            </div>
                            <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg mt-2 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="temporary-switch" className="flex items-center gap-2 font-medium text-foreground"><AlarmClock className="h-4 w-4 text-muted-foreground" />Temporary Memory</label>
                                    <Switch id="temporary-switch" checked={isTemporary} onCheckedChange={handleTemporaryToggle} />
                                </div>
                                {isTemporary && (<div className="pl-6 space-y-2">{item.expiresAt && (<div className="text-sm text-muted-foreground">Expires in {formatDistanceToNow(new Date(item.expiresAt), { addSuffix: false })} on {format(new Date(item.expiresAt), 'MMM d, yyyy')}</div>)}<Select onValueChange={handleExpiryChange}><SelectTrigger className="w-full bg-background focus:ring-accent"><SelectValue placeholder="Change expiration..." /></SelectTrigger><SelectContent><SelectItem value="7">Delete after 7 days</SelectItem><SelectItem value="30">Delete after 30 days</SelectItem><SelectItem value="90">Delete after 90 days</SelectItem><SelectItem value="365">Delete after 1 year</SelectItem></SelectContent></Select></div>)}
                            </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className={cn(
                    showMediaColumn ? "md:grid md:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)] gap-8" : ""
                  )}>
                    {showMediaColumn && (
                       <div className="relative w-full overflow-hidden rounded-xl flex items-center justify-center">
                        {isFetchingOembed ? (
                          <div className="w-full aspect-video flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : oembedHtml ? (
                          <div className="oembed-container w-full" dangerouslySetInnerHTML={{ __html: oembedHtml }} />
                        ) : item.imageUrl && !imageError ? (
                           <div className="relative">
                            <img
                                src={item.imageUrl}
                                alt={editableTitle || 'Content Image'}
                                data-ai-hint={item.title || "image"}
                                className="w-full h-full object-cover rounded-xl"
                                loading="lazy"
                                onError={() => setImageError(true)}
                              />
                            {item.status === 'pending-analysis' && (
                                <div className="absolute inset-0 bg-black/10 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center rounded-xl">
                                    <Sparkles className="h-12 w-12 mb-4 animate-pulse text-primary-foreground" />
                                    <p className="text-xl font-semibold text-primary-foreground shadow-black [text-shadow:0_1px_3px_var(--tw-shadow-color)]">Unlocking the story behind this memory...</p>
                                </div>
                            )}
                           </div>
                        ) : (item.type === 'link' && item.contentType === 'PDF' && item.url) ? (
                            <iframe src={item.url} className="w-full h-full min-h-[70vh] rounded-xl border-0" title={editableTitle || 'PDF Preview'}></iframe>
                        ) : null}
                      </div>
                    )}

                    <div className="flex flex-col space-y-4 mt-6 md:mt-0">
                        {/* Title, Domain, Movie Details */}
                        <div className="space-y-4">
                            {item.domain && item.domain !== 'mati.internal.storage' && (
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

                            <div className="flex items-center space-x-2 relative">
                                {isSavingField && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground absolute -left-7 top-1/2 -translate-y-1/2" />}
                                <Input
                                    value={editableTitle}
                                    onChange={handleTitleChange}
                                    onBlur={handleTitleBlur}
                                    disabled={isSavingField || isUpdatingTags}
                                    className="text-2xl font-headline font-semibold border-0 focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-0 shadow-none p-0 h-auto flex-grow"
                                    placeholder="Enter title"
                                />
                            </div>

                            {item.type === 'movie' && item.movieDetails && (
                              <div className="space-y-2 border-b pb-3 mb-2">
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Star className="h-4 w-4 mr-1.5 text-yellow-400 fill-yellow-400" />
                                  <span>{item.movieDetails.rating ? `${item.movieDetails.rating.toFixed(1)}/10` : 'N/A'}</span>
                                  <span className="mx-2">|</span>
                                  <CalendarDays className="h-4 w-4 mr-1.5" />
                                  <span>{item.movieDetails.releaseYear || 'N/A'}</span>
                                </div>
                                {item.movieDetails.director && <p className="text-sm"><strong className="font-medium text-foreground">Director:</strong> {item.movieDetails.director}</p>}
                                 {item.movieDetails.cast && item.movieDetails.cast.length > 0 && <p className="text-sm"><strong className="font-medium text-foreground">Cast:</strong> {item.movieDetails.cast.slice(0,5).join(', ')}{item.movieDetails.cast.length > 5 ? '...' : ''}</p>}
                                {item.movieDetails.genres && item.movieDetails.genres.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {item.movieDetails.genres.map(genre => (
                                      <Badge key={genre} variant="secondary" className="text-xs">{genre}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                        
                        <Separator />

                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium mb-2 block">Zone</Label>
                               <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                                  <PopoverTrigger asChild>
                                      <Button variant="outline" role="combobox" aria-expanded={isComboboxOpen} className={cn("w-full justify-between", (isSavingField || isUpdatingTags) ? "opacity-50" : "", !editableZoneId && "text-muted-foreground")} disabled={isSavingField || isUpdatingTags}>
                                          <div className="flex items-center"><ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" /><span className="truncate">{zoneDisplayName}</span></div>
                                          <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                      <Command><CommandInput placeholder="Search or create zone..." value={comboboxSearchText} onValueChange={setComboboxSearchText} /><CommandList><CommandEmpty><div className="py-6 text-center text-sm">{comboboxSearchText.trim() === '' ? 'No zones found.' : 'No matching zones found.'}</div></CommandEmpty><CommandGroup><CommandItem value={NO_ZONE_VALUE} onSelect={() => handleZoneSelection(undefined)}><Check className={cn("mr-2 h-4 w-4", !editableZoneId ? "opacity-100" : "opacity-0")} /><Ban className="mr-2 h-4 w-4 opacity-70 text-muted-foreground" />No Zone Assigned</CommandItem>{filteredZones.map((z) => {const ListItemIcon = getIconComponent(z.icon);return (<CommandItem key={z.id} value={z.id} onSelect={(currentValue) => {handleZoneSelection(currentValue === editableZoneId ? undefined : currentValue);}}><Check className={cn("mr-2 h-4 w-4", editableZoneId === z.id ? "opacity-100" : "opacity-0")} /><ListItemIcon className="mr-2 h-4 w-4 opacity-70" />{z.name}</CommandItem>);})}</CommandGroup>{comboboxSearchText.trim() !== '' && !filteredZones.some(z => z.name.toLowerCase() === comboboxSearchText.trim().toLowerCase()) && (<CommandGroup className="border-t"><CommandItem onSelect={() => handleCreateZone(comboboxSearchText)} className="text-primary hover:!bg-primary/10 cursor-pointer"><Plus className="mr-2 h-4 w-4" /> Create "{comboboxSearchText.trim()}"</CommandItem></CommandGroup>)}</CommandList></Command>
                                  </PopoverContent>
                              </Popover>
                            </div>
                             <div className="space-y-2">
                                <Label className="text-sm font-medium mb-2 block">Tags</Label>
                                <div className="flex flex-wrap items-center gap-2">
                                  {editableTags.map(tag => (<Badge key={tag.id} variant="secondary" className="px-3 py-1 text-sm rounded-full font-medium group relative">{tag.name}<Button variant="ghost" size="icon" className="h-5 w-5 ml-1.5 p-0.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive absolute -right-1.5 -top-1.5 rounded-full bg-background/50" onClick={() => handleRemoveTag(tag.id)} disabled={isUpdatingTags || isSavingField} aria-label={`Remove tag ${tag.name}`}><X className="h-3 w-3" /></Button></Badge>))}
                                  {isAddingTag ? (<div className="flex items-center gap-1"><Input ref={newTagInputRef} value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} placeholder="New tag" onKeyDown={handleTagInputKeyDown} disabled={isUpdatingTags || isSavingField} className="h-8 text-sm w-32 focus-visible:ring-accent" autoFocus /><Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAddNewTag} disabled={isUpdatingTags || isSavingField || newTagInput.trim() === ''} aria-label="Confirm add tag" ><Check className="h-4 w-4 text-green-600" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelAddTag} disabled={isUpdatingTags || isSavingField} aria-label="Cancel add tag" ><X className="h-4 w-4 text-destructive" /></Button></div>) : (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setIsAddingTag(true)} disabled={isUpdatingTags || isSavingField} aria-label="Add new tag" ><Plus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Add new tag</p></TooltipContent></Tooltip></TooltipProvider>)}
                                  {isUpdatingTags && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                </div>
                            </div>
                        </div>

                        {/* AI Analysis Section */}
                        {(isDescriptionReadOnly || (item.colorPalette && item.colorPalette.length > 0) || item.status === 'pending-analysis') && (
                          <div className="space-y-4 pt-2">
                              {item.status === 'pending-analysis' ? (
                                  <div className="space-y-3">
                                      <Skeleton className="h-16 w-full" />
                                      <Skeleton className="h-2.5 w-full rounded-full" />
                                  </div>
                              ) : (
                                <>
                                  {isDescriptionReadOnly && editableDescription && (
                                    <div className="prose dark:prose-invert prose-sm max-w-none text-muted-foreground">
                                      <p className={cn(!isDescriptionExpanded && "line-clamp-4")}>
                                        <span dangerouslySetInnerHTML={{ __html: editableDescription.replace(/\n/g, '<br />') }} />
                                      </p>
                                      {needsTruncation && (
                                        <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                                          {isDescriptionExpanded ? "Show less" : "Show more"}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                  {item.colorPalette && item.colorPalette.length > 0 && <ColorPalette palette={item.colorPalette} />}
                                </>
                              )}
                          </div>
                        )}
                        
                        {/* Editable Description Section */}
                        {!isDescriptionReadOnly && (
                          <div className="space-y-2">
                            <Textarea
                                value={editableDescription}
                                onChange={handleDescriptionChange}
                                onBlur={handleDescriptionBlur}
                                disabled={isSavingField || isUpdatingTags}
                                placeholder="Enter description..."
                                className="w-full h-auto min-h-[120px] focus-visible:ring-accent"
                            />
                          </div>
                        )}

                        {/* Mind Note Section */}
                        {showMindNote && (
                          <div className="space-y-2">
                             <Textarea
                                value={editableMindNote}
                                onChange={handleMindNoteChange}
                                onBlur={handleMindNoteBlur}
                                disabled={isSavingField || isUpdatingTags}
                                placeholder="Add your personal thoughts or quick notes here..."
                                className="w-full min-h-[80px] focus-visible:ring-accent bg-muted/30 dark:bg-card border-border"
                              />
                          </div>
                        )}

                        {/* Settings Section */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="temporary-switch" className="font-medium text-foreground">Temporary Memory</label>
                                <Switch id="temporary-switch" checked={isTemporary} onCheckedChange={handleTemporaryToggle} />
                            </div>
                            {isTemporary && (
                                <div className="space-y-2">
                                    {item.expiresAt && (<div className="text-sm text-muted-foreground">Expires in {formatDistanceToNow(new Date(item.expiresAt), { addSuffix: false })} on {format(new Date(item.expiresAt), 'MMM d, yyyy')}</div>)}
                                    <Select onValueChange={handleExpiryChange}><SelectTrigger className="w-full bg-background focus:ring-accent"><SelectValue placeholder="Change expiration..." /></SelectTrigger><SelectContent><SelectItem value="7">Delete after 7 days</SelectItem><SelectItem value="30">Delete after 30 days</SelectItem><SelectItem value="90">Delete after 90 days</SelectItem><SelectItem value="365">Delete after 1 year</SelectItem></SelectContent></Select>
                                </div>
                            )}
                        </div>
                    </div> 
                  </div> 
                );
              })()
            )}
          </div>


          <DialogFooter className="border-t pt-4 flex-shrink-0">
            {item && !isLoading && !error && (
              <div className="text-xs text-muted-foreground flex items-center mr-auto">
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                <span>Created: {format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
              </div>
            )}
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
