

'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
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
import { CalendarDays, ExternalLink, StickyNote, Plus, X, Loader2, Check, Edit3, Globe, Bookmark, Pencil, ChevronDown, Ban, Briefcase, Home, Library, Star, Film, Users, Clapperboard, Glasses, AlarmClock, Sparkles, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow, add } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';


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

interface ContentDetailDialogProps {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdate?: (updatedItem: ContentItem) => void;
}

export default function ContentDetailDialog({ item: initialItem, open, onOpenChange, onItemUpdate }: ContentDetailDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [item, setItem] = useState<ContentItem | null>(initialItem);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editableMindNote, setEditableMindNote] = useState('');
  const [editableZoneId, setEditableZoneId] = useState<string | undefined>(undefined);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const [allZones, setAllZones] = useState<Zone[]>([]);

  const [editableTags, setEditableTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [comboboxSearchText, setComboboxSearchText] = useState('');

  // oEmbed state
  const [oembedHtml, setOembedHtml] = useState<string | null>(null);
  const [isFetchingOembed, setIsFetchingOembed] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [isTemporary, setIsTemporary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (open && initialItem) {
      setItem(initialItem); // Use the passed item immediately
      setIsLoading(false); // No loading state needed for initial render
      setError(null);
      setOembedHtml(null);

      // Fetch supporting data and fresh item data in the background
      const fetchSupportingData = async () => {
        try {
          // Fetch fresh item data to ensure consistency
          const freshItemPromise = getContentItemById(initialItem.id);
          const zonesPromise = getZones(initialItem.userId!);
          
          const [freshItem, fetchedZones] = await Promise.all([freshItemPromise, zonesPromise]);
          
          if (freshItem) {
            setItem(freshItem); // Update with the latest data
          }
          setAllZones(fetchedZones);
          
          // Fetch oEmbed if necessary
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
      // Reset state when dialog is closed
      setItem(null);
      setIsLoading(true); 
      setError(null);
      setOembedHtml(null);
    }
  }, [initialItem, open]); 

  useEffect(() => {
    if (item) {
      setEditableTitle(item.title);
      setEditableDescription(item.description || '');
      setEditableMindNote(item.mindNote || '');
      setEditableZoneId(item.zoneId);
      setEditableTags(item.tags || []);
      setIsTemporary(!!item.expiresAt);
      setIsDescriptionExpanded(false);
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

  const handleFieldUpdate = useCallback(async (
    fieldName: keyof Pick<ContentItem, 'title' | 'description' | 'mindNote' | 'zoneId' | 'expiresAt' | 'tags'>,
    value: any
  ) => {
    if (!item) return;
    setIsSaving(true);
    const previousValue = item[fieldName];
    
    // Optimistic UI update
    const updatedItem = { ...item, [fieldName]: value };
    setItem(updatedItem);
    if (onItemUpdate) {
        onItemUpdate(updatedItem);
    }
    
    try {
        await updateContentItem(item.id, { [fieldName]: value });
    } catch (e) {
        console.error(`Error updating ${fieldName}:`, e);
        // Revert UI on failure
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
          const newExpiryDate = add(new Date(), { days: 30 });
          handleFieldUpdate('expiresAt', newExpiryDate.toISOString());
      } else {
          handleFieldUpdate('expiresAt', undefined);
      }
  };
  
  const handleExpiryChange = (value: string) => {
    const newExpiryDate = add(new Date(), { days: parseInt(value, 10) });
    handleFieldUpdate('expiresAt', newExpiryDate.toISOString());
  };
    
  const selectedZone = allZones.find(z => z.id === editableZoneId);
  const zoneDisplayName = selectedZone?.name || "No zone";
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon);
  const filteredZones = comboboxSearchText ? allZones.filter(z => z.name.toLowerCase().includes(comboboxSearchText.toLowerCase())) : allZones;

  if (!open) { 
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-transparent border-0 shadow-none p-0 flex items-center justify-center w-full h-full max-w-none">
        <motion.div
          layoutId={`card-animation-${initialItem?.id}`}
          className="relative flex flex-col bg-card rounded-xl shadow-2xl w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] md:w-full md:h-auto md:max-h-[90vh] md:max-w-6xl"
        >
          <DialogHeader className="sr-only">
            {/* The title is visually rendered in the main content but required for accessibility. */}
            <DialogTitle>{item?.title || "Content Details"}</DialogTitle>
          </DialogHeader>

          <DialogClose className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <div className="flex-grow overflow-y-auto custom-scrollbar md:grid md:grid-cols-2 md:gap-0 h-full rounded-xl">
            {isLoading ? (
              <div className="flex items-center justify-center h-full col-span-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
              </div>
            ) : error || !item ? (
              <div className="flex-grow flex items-center justify-center py-8 text-center h-full col-span-2">
                <div>
                  <X className="h-12 w-12 mx-auto text-destructive mb-3" />
                  <h2 className="text-xl font-semibold text-destructive">
                    {error || 'Content Item Not Found'}
                  </h2>
                  <p className="text-muted-foreground mt-1">Please try again or select another item.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="relative w-full md:h-full flex flex-col items-center justify-center rounded-l-lg overflow-y-auto custom-scrollbar md:p-4 bg-muted/20">
                    <div className="w-full md:h-full flex items-center justify-center">
                    {isFetchingOembed ? (
                      <div className="w-full aspect-video flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : oembedHtml ? (
                      <div className="oembed-container w-full" dangerouslySetInnerHTML={{ __html: oembedHtml }} />
                    ) : item.imageUrl && !imageError ? (
                        <div className="relative w-full md:h-full">
                         <img
                          src={item.imageUrl}
                          alt={editableTitle || 'Content Image'}
                          data-ai-hint={item.title || "image"}
                          className="w-full object-contain md:h-full"
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
                        <iframe src={item.url} className="w-full h-[60vh] md:h-full md:min-h-[70vh] rounded-xl border-0" title={editableTitle || 'PDF Preview'}></iframe>
                    ) : (
                      <div className="w-full md:h-full flex items-center justify-center py-20">
                          <p className="text-muted-foreground">No preview available</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-4 bg-card text-card-foreground p-6 rounded-r-lg overflow-y-auto custom-scrollbar shadow-lg">
                  
                  <div className="space-y-2">
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
                    <Input
                        value={editableTitle}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        className="text-2xl font-headline font-semibold border-0 focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-0 shadow-none p-0 h-auto flex-grow bg-transparent"
                        placeholder="Enter title"
                    />
                  </div>
                  
                  <Accordion type="single" collapsible className="w-full" defaultValue="ai-analysis">
                      <AccordionItem value="ai-analysis">
                          <AccordionTrigger>
                              <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              <span>AI Analysis</span>
                              </div>
                          </AccordionTrigger>
                          <AccordionContent>
                             <div className="pl-6 space-y-4">
                                {item.status === 'pending-analysis' ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-16 w-full" />
                                        <Skeleton className="h-2.5 w-full" />
                                    </div>
                                ) : editableDescription ? (
                                    <div className="prose dark:prose-invert prose-sm max-w-none text-muted-foreground">
                                        <p className={cn(!isDescriptionExpanded && "line-clamp-4")}>
                                            <span dangerouslySetInnerHTML={{ __html: editableDescription.replace(/\n/g, '<br />') }} />
                                        </p>
                                        {editableDescription.length > 280 && (
                                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                                                {isDescriptionExpanded ? "Show less" : "Show more"}
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">No description generated.</p>
                                )}
                                <div className="space-y-2">
                                  <Label>Color Palette</Label>
                                  {item.status === 'pending-analysis' ? <Skeleton className="h-2.5 w-full rounded-full" /> : <ColorPalette palette={item.colorPalette} />}
                                </div>
                             </div>
                          </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="mind-note">
                          <AccordionTrigger>
                              <div className="flex items-center gap-2">
                              <Pencil className="h-4 w-4" />
                              <span>Mind Note</span>
                              </div>
                          </AccordionTrigger>
                           <AccordionContent>
                             <div className="pl-2">
                                <Textarea
                                value={editableMindNote}
                                onChange={handleMindNoteChange}
                                onBlur={handleMindNoteBlur}
                                placeholder="Add your personal thoughts..."
                                className="w-full min-h-[120px] focus-visible:ring-accent bg-muted/30 dark:bg-muted/20 border-border"
                                />
                             </div>
                          </AccordionContent>
                      </AccordionItem>
                  </Accordion>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                      <div>
                          <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                              <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" aria-expanded={isComboboxOpen} className={cn("w-full justify-between", isSaving ? "opacity-50" : "", !editableZoneId && "text-muted-foreground")} disabled={isSaving}>
                                      <div className="flex items-center"><ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" /><span className="truncate">{zoneDisplayName}</span></div>
                                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                  <Command><CommandInput placeholder="Search or create zone..." value={comboboxSearchText} onValueChange={setComboboxSearchText} /><CommandList><CommandEmpty><div className="py-6 text-center text-sm">{comboboxSearchText.trim() === '' ? 'No zones found.' : 'No matching zones found.'}</div></CommandEmpty><CommandGroup><CommandItem value={NO_ZONE_VALUE} onSelect={() => handleZoneSelection(undefined)}><Check className={cn("mr-2 h-4 w-4", !editableZoneId ? "opacity-100" : "opacity-0")} /><Ban className="mr-2 h-4 w-4 opacity-70 text-muted-foreground" />No Zone Assigned</CommandItem>{filteredZones.map((z) => {const ListItemIcon = getIconComponent(z.icon);return (<CommandItem key={z.id} value={z.id} onSelect={(currentValue) => {handleZoneSelection(currentValue === editableZoneId ? undefined : currentValue);}}><Check className={cn("mr-2 h-4 w-4", editableZoneId === z.id ? "opacity-100" : "opacity-0")} /><ListItemIcon className="mr-2 h-4 w-4 opacity-70" />{z.name}</CommandItem>);})}</CommandGroup>{comboboxSearchText.trim() !== '' && !filteredZones.some(z => z.name.toLowerCase() === comboboxSearchText.trim().toLowerCase()) && (<CommandGroup className="border-t"><CommandItem onSelect={() => handleCreateZone(comboboxSearchText)} className="text-primary hover:!bg-primary/10 cursor-pointer"><Plus className="mr-2 h-4 w-4" /> Create "{comboboxSearchText.trim()}"</CommandItem></CommandGroup>)}</CommandList></Command>
                              </PopoverContent>
                          </Popover>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                          <Label className="text-sm font-medium mr-2">Tags:</Label>
                          {editableTags.map(tag => (<Badge key={tag.id} variant="secondary" className="px-3 py-1 text-sm rounded-full font-medium group relative">{tag.name}<Button variant="ghost" size="icon" className="h-5 w-5 ml-1.5 p-0.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive absolute -right-1.5 -top-1.5 rounded-full bg-background/50" onClick={() => handleRemoveTag(tag.id)} aria-label={`Remove tag ${tag.name}`}><X className="h-3 w-3" /></Button></Badge>))}
                          {isAddingTag ? (<div className="flex items-center gap-1"><Input ref={newTagInputRef} value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} placeholder="New tag" onKeyDown={handleTagInputKeyDown} className="h-8 text-sm w-32 focus-visible:ring-accent" autoFocus /><Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAddNewTag} disabled={newTagInput.trim() === ''} aria-label="Confirm add tag" ><Check className="h-4 w-4 text-green-600" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelAddTag} aria-label="Cancel add tag" ><X className="h-4 w-4 text-destructive" /></Button></div>) : (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setIsAddingTag(true)} aria-label="Add new tag" ><Plus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Add new tag</p></TooltipContent></Tooltip></TooltipProvider>)}
                      </div>
                  </div>
                  
                  <Separator />

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
              </>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
