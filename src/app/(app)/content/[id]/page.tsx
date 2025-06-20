
'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getContentItemById, updateContentItem, getZones, addZone } from '@/services/contentService';
import type { ContentItem, Zone, Tag, MovieDetails } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, CalendarDays, ExternalLink, StickyNote, Plus, X, Loader2, Check, Edit3, Globe, Bookmark, Pencil, ChevronDown, Ban, Briefcase, Home, Library, Star, Film, Users, Clapperboard, Glasses } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ReadableArticleView from '@/components/core/ReadableArticleView';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const NO_ZONE_VALUE = "__NO_ZONE__";

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


const tagColorPalettes = [
  'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100',
  'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100',
  'bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-100',
  'bg-pink-100 text-pink-800 dark:bg-pink-700 dark:text-pink-100',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-600 dark:text-yellow-100',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-700 dark:text-indigo-100',
  'bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-100',
  'bg-sky-100 text-sky-800 dark:bg-sky-700 dark:text-sky-100',
  'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100',
  'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-100',
];

const getTagStyles = (tagName: string): string => {
  let hash = 0;
  if (!tagName || tagName.length === 0) {
    return tagColorPalettes[0];
  }
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % tagColorPalettes.length;
  return tagColorPalettes[index];
};

const getEmbedUrl = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = urlObj.searchParams.get('v');
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.substring(1);
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
  } catch (e) {
    console.warn("Could not parse URL for embed:", url, e);
    return null;
  }
  return null;
};


export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [item, setItem] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editableMindNote, setEditableMindNote] = useState('');
  const [editableZoneId, setEditableZoneId] = useState<string | undefined>(undefined);

  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [isSavingField, setIsSavingField] = useState(false);

  const [editableTags, setEditableTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [comboboxSearchText, setComboboxSearchText] = useState('');

  const [isArticleViewOpen, setIsArticleViewOpen] = useState(false);
  const [articleViewData, setArticleViewData] = useState<{ title: string; content: string } | null>(null);
  const [isFetchingArticle, setIsFetchingArticle] = useState(false);


  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        setEmbedUrl(null);
        try {
          const fetchedItem = await getContentItemById(id);
          if (fetchedItem) {
            setItem(fetchedItem);
            if (fetchedItem.type === 'link' && fetchedItem.url) {
              setEmbedUrl(getEmbedUrl(fetchedItem.url));
            }
          } else {
            setError('Content item not found.');
          }
        } catch (e) {
          console.error('Error fetching content details:', e);
          setError('Failed to load content details.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();

      const fetchAllZonesData = async () => {
        try {
            const fetchedZones = await getZones();
            setAllZones(fetchedZones);
        } catch (e) {
            console.error("Failed to fetch zones for dropdown", e);
        }
      };
      fetchAllZonesData();
    }
  }, [id]);

  useEffect(() => {
    if (item) {
      setEditableTitle(item.title);
      setEditableDescription(item.description || '');
      setEditableMindNote(item.mindNote || '');
      setEditableZoneId(item.zoneId);
      setEditableTags(item.tags || []);
    }
  }, [item]);


  useEffect(() => {
    if (isAddingTag && newTagInputRef.current) {
      newTagInputRef.current.focus();
    }
  }, [isAddingTag]);

  const handleFieldUpdate = async (fieldName: keyof Pick<ContentItem, 'title' | 'description' | 'mindNote' | 'zoneId'>, value: any) => {
    if (!item || isSavingField) return;
    setIsSavingField(true);

    try {
      let updatePayload: Partial<ContentItem> = { [fieldName]: value };
      const updatedItem = await updateContentItem(item.id, updatePayload);
      if (updatedItem) {
        setItem(updatedItem);
      } else {
        throw new Error(`Failed to update ${fieldName}.`);
      }
    } catch (e) {
      console.error(`Error updating ${fieldName}:`, e);
      toast({ title: "Error", description: `Could not update ${fieldName}.`, variant: "destructive" });
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
       if (item.type === 'note' || item.type === 'todo' || item.type === 'movie') { // Allow movie description edit
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
    if (!zoneName.trim()) return;
    setIsSavingField(true);
    try {
      const newZone = await addZone(zoneName.trim());
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
      } else {
        throw new Error("Failed to update item tags.");
      }
    } catch (e) {
      console.error('Error updating tags:', e);
      toast({ title: "Error", description: "Could not save tags. Please try again.", variant: "destructive" });
      if(item) setEditableTags(item.tags || []);
    } finally {
      setIsUpdatingTags(false);
    }
  };

  const handleRemoveTag = (tagIdToRemove: string) => {
    const newTags = editableTags.filter(tag => tag.id !== tagIdToRemove);
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
    const newTag: Tag = { id: Date.now().toString(), name: newTagInput.trim() };
    const newTags = [...editableTags, newTag];

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

  const handleOpenSimplifiedView = async () => {
    if (!item || !item.url) return;
    setIsFetchingArticle(true);
    try {
      const response = await fetch(`/api/readability?url=${encodeURIComponent(item.url)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch article (status: ${response.status})`);
      }
      const data = await response.json();
      setArticleViewData({ title: data.title, content: data.content });
      setIsArticleViewOpen(true);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      toast({
        title: "Error Fetching Article",
        description: `Could not load simplified view: ${errorMessage}`,
        variant: "destructive",
      });
      setArticleViewData(null);
    } finally {
      setIsFetchingArticle(false);
    }
  };


  if (isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-6"></div>
          <div className="space-y-4">
            <div className="h-40 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-semibold text-destructive mb-4">{error}</h1>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-semibold text-muted-foreground">Content Item Not Found</h1>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const isDescriptionReadOnly = (item.type === 'link' && item.contentType !== 'Article' && item.type !== 'movie') || item.type === 'image' || item.type === 'voice';
  const showMindNote = item.type === 'link' || item.type === 'image' || item.type === 'voice' || item.type === 'movie';
  const showMediaColumn = embedUrl || (item.imageUrl && (item.type === 'link' || item.type === 'image' || item.type === 'note' || item.type === 'voice' || item.type === 'movie'));


  const filteredZones = comboboxSearchText
    ? allZones.filter(z => z.name.toLowerCase().includes(comboboxSearchText.toLowerCase()))
    : allZones;

  const currentZoneObject = editableZoneId ? allZones.find(z => z.id === editableZoneId) : undefined;
  const ZoneDisplayIcon = getIconComponent(currentZoneObject?.icon);
  const zoneDisplayName = currentZoneObject?.name || "No Zone Assigned";

  const tagBaseClasses = "px-3 py-1 text-xs rounded-full font-medium group relative";


  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="shadow-xl overflow-hidden">
        <div className={cn(
          showMediaColumn ? "md:grid md:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)] gap-6" : ""
        )}>
          {showMediaColumn && (
            <div className={cn(
                "relative w-full overflow-hidden rounded-xl shadow-sm",
                embedUrl ? "aspect-video" : "aspect-[3/4] md:aspect-auto md:h-full"
            )}>
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={editableTitle || 'Embedded Content'}
                  className="absolute top-0 left-0 w-full h-full border-0 rounded-xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              ) : item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={editableTitle || 'Content Image'}
                  data-ai-hint={item.title || "image"}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover rounded-xl"
                />
              ) : null}
            </div>
          )}

          <div className="flex flex-col">
             <CardHeader className={cn(
                "pb-2", // Reduced bottom padding
                 showMediaColumn ? "" : "rounded-t-lg"
            )}>
              {item.domain && (
                <div className="flex items-center text-xs text-muted-foreground mb-1.5">
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  <span>{item.domain}</span>
                  {(item.type === 'link' || item.type === 'movie') && item.url && (
                    <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1 ml-1 text-primary hover:text-primary/80" title={`Open link: ${item.url}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </TooltipTrigger>
                        <TooltipContent><p>Open link</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between space-x-2 pr-20 relative">
                <div className="flex items-center space-x-2 flex-grow">
                    {isSavingField && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                    <Input
                        value={editableTitle}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        disabled={isSavingField || isUpdatingTags}
                        className="text-3xl font-headline font-semibold border-0 focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-0 shadow-none p-0 h-auto flex-grow"
                        placeholder="Enter title"
                    />
                </div>
              </div>
               {item.contentType === 'Article' && item.url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleOpenSimplifiedView}
                  disabled={isFetchingArticle}
                >
                  {isFetchingArticle ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Glasses className="mr-2 h-4 w-4" />
                  )}
                  Simplified View
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pt-4 flex-grow"> {/* Increased top padding if article button not present */}
              {item.type === 'movie' && item.movieDetails && (
                <div className="space-y-2 border-b pb-3 mb-3">
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

              <div>
                <h3 className="text-lg font-semibold mb-1 text-foreground flex items-center sr-only">
                    <Edit3 className="h-4 w-4 mr-2 text-muted-foreground"/> Description
                </h3>
                {isDescriptionReadOnly ? (
                    <div className={cn(
                        "prose dark:prose-invert prose-sm max-w-none py-2 px-1 min-h-[60px]",
                        "text-sm text-gray-500 dark:text-gray-400"
                      )}
                    >
                        {editableDescription ? (
                            <div dangerouslySetInnerHTML={{ __html: editableDescription.replace(/\n/g, '<br />') }} />
                        ) : (
                            <p className="italic">No description provided.</p>
                        )}
                    </div>
                ) : (
                    <Textarea
                        value={editableDescription}
                        onChange={handleDescriptionChange}
                        onBlur={handleDescriptionBlur}
                        disabled={isSavingField || isUpdatingTags}
                        placeholder="Enter description..."
                        className="w-full min-h-[100px] focus-visible:ring-accent"
                    />
                )}
              </div>

              {item.type === 'voice' && item.audioUrl && (
                <div className="mt-2">
                  <audio controls src={item.audioUrl} className="w-full">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              <div className="text-sm items-center pt-1">
                <div className="flex items-center space-x-2">
                     <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isComboboxOpen}
                                className={cn(
                                    "w-auto justify-between text-sm min-w-[180px]",
                                    (isSavingField || isUpdatingTags) ? "opacity-50" : "",
                                    !editableZoneId && "text-muted-foreground"
                                )}
                                disabled={isSavingField || isUpdatingTags}
                            >
                                <div className="flex items-center">
                                    <ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" />
                                    <span className="truncate">{zoneDisplayName}</span>
                                </div>
                                <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-gray-50 dark:bg-gray-700">
                            <Command>
                                <CommandInput
                                    placeholder="Search or create zone..."
                                    value={comboboxSearchText}
                                    onValueChange={setComboboxSearchText}
                                />
                                <CommandList>
                                    <CommandEmpty>
                                    {comboboxSearchText.trim() === '' ? 'No zone found.' : (
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => handleCreateZone(comboboxSearchText)}
                                        >
                                            <Plus className="mr-2 h-4 w-4" /> Create "{comboboxSearchText}"
                                        </Button>
                                    )}
                                    </CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value={NO_ZONE_VALUE}
                                            onSelect={() => handleZoneSelection(NO_ZONE_VALUE)}
                                        >
                                            <Check
                                                className={cn(
                                                "mr-2 h-4 w-4",
                                                !editableZoneId ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <Ban className="mr-2 h-4 w-4 opacity-70 text-muted-foreground" />
                                            No Zone Assigned
                                        </CommandItem>
                                        {filteredZones.map((z) => {
                                          const ListItemIcon = getIconComponent(z.icon);
                                          return (
                                            <CommandItem
                                                key={z.id}
                                                value={z.id}
                                                onSelect={(currentValue) => {
                                                    handleZoneSelection(currentValue === editableZoneId ? undefined : currentValue);
                                                }}
                                            >
                                                <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    editableZoneId === z.id ? "opacity-100" : "opacity-0"
                                                )}
                                                />
                                                <ListItemIcon className="mr-2 h-4 w-4 opacity-70" />
                                                {z.name}
                                            </CommandItem>
                                          );
                                        })}
                                    </CommandGroup>
                                </CommandList>
                                {comboboxSearchText.trim() !== '' && !filteredZones.some(z => z.name.toLowerCase() === comboboxSearchText.trim().toLowerCase()) && (
                                    <CommandGroup className="border-t">
                                        <CommandItem onSelect={() => handleCreateZone(comboboxSearchText)} className="text-primary hover:!bg-primary/10 cursor-pointer">
                                            <Plus className="mr-2 h-4 w-4" /> Create "{comboboxSearchText.trim()}"
                                        </CommandItem>
                                    </CommandGroup>
                                )}
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
              </div>

              <div className="pt-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {editableTags.map(tag => (
                    <Badge key={tag.id} className={cn(tagBaseClasses, getTagStyles(tag.name))}>
                      {tag.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-1.5 p-0.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive absolute -right-1 -top-1 rounded-full bg-background/50"
                        onClick={() => handleRemoveTag(tag.id)}
                        disabled={isUpdatingTags || isSavingField}
                        aria-label={`Remove tag ${tag.name}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {isAddingTag ? (
                    <div className="flex items-center gap-1">
                      <Input
                        ref={newTagInputRef}
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="New tag"
                        onKeyDown={handleTagInputKeyDown}
                        disabled={isUpdatingTags || isSavingField}
                        className="h-8 text-sm w-32 focus-visible:ring-accent"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleAddNewTag}
                        disabled={isUpdatingTags || isSavingField || newTagInput.trim() === ''}
                        aria-label="Confirm add tag"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleCancelAddTag}
                        disabled={isUpdatingTags || isSavingField}
                        aria-label="Cancel add tag"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={() => setIsAddingTag(true)}
                                    disabled={isUpdatingTags || isSavingField}
                                    aria-label="Add new tag"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Add new tag</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                  )}
                  {isUpdatingTags && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                </div>
                {editableTags.length === 0 && !isAddingTag && !isUpdatingTags && (
                    <p className="text-sm text-muted-foreground">No tags yet. Click '+' to add one.</p>
                )}
              </div>

              {showMindNote && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mt-4">
                    <h3 className="text-lg font-semibold mb-1 text-foreground flex items-center">
                        <StickyNote className="h-4 w-4 mr-2 text-muted-foreground"/> Mind Note
                    </h3>
                    <Textarea
                        value={editableMindNote}
                        onChange={handleMindNoteChange}
                        onBlur={handleMindNoteBlur}
                        disabled={isSavingField || isUpdatingTags}
                        placeholder="Add your personal thoughts or quick notes here..."
                        className="w-full min-h-[80px] focus-visible:ring-accent bg-transparent dark:bg-transparent border-gray-300 dark:border-gray-700"
                    />
                </div>
              )}

            </CardContent>
            <CardFooter className="flex justify-end pt-4">
                <div className="text-xs text-muted-foreground flex items-center">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                    <span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                </div>
            </CardFooter>
          </div>
        </div>
      </Card>
      {articleViewData && (
        <ReadableArticleView
          open={isArticleViewOpen}
          onOpenChange={setIsArticleViewOpen}
          title={articleViewData.title}
          htmlContent={articleViewData.content}
        />
      )}
    </div>
  );
}
