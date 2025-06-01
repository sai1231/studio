
'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getContentItemById, getZoneById, updateContentItem, getZones } from '@/services/contentService';
import type { ContentItem, Zone, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CalendarDays, Folder, Tag as TagIcon, Globe, StickyNote, FileImage, ExternalLink, ListChecks, Mic, Layers, Landmark, Plus, X, Loader2, Check, Edit3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const getTypeIcon = (type: ContentItem['type'] | undefined) => {
  if (!type) return <StickyNote className="h-5 w-5 text-muted-foreground" />;
  switch (type) {
    case 'link':
      return <Globe className="h-5 w-5 text-primary" />;
    case 'note':
      return <StickyNote className="h-5 w-5 text-primary" />;
    case 'image':
      return <FileImage className="h-5 w-5 text-primary" />;
    case 'todo':
      return <ListChecks className="h-5 w-5 text-primary" />;
    case 'voice':
      return <Mic className="h-5 w-5 text-primary" />;
    default:
      return <StickyNote className="h-5 w-5 text-muted-foreground" />;
  }
};

const NO_ZONE_VALUE = "__NO_ZONE__"; 

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [item, setItem] = useState<ContentItem | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editableMindNote, setEditableMindNote] = useState('');
  const [editableZoneId, setEditableZoneId] = useState<string | undefined>(undefined);
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [isSavingItemDetails, setIsSavingItemDetails] = useState(false);
  const [hasContentChanges, setHasContentChanges] = useState(false);

  const [editableTags, setEditableTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedItem = await getContentItemById(id);
          if (fetchedItem) {
            setItem(fetchedItem);
            setEditableTitle(fetchedItem.title);
            setEditableDescription(fetchedItem.description || '');
            setEditableMindNote(fetchedItem.mindNote || '');
            setEditableZoneId(fetchedItem.zoneId);
            setEditableTags(fetchedItem.tags || []);

            if (fetchedItem.zoneId) {
              const fetchedCurrentZone = await getZoneById(fetchedItem.zoneId);
              setZone(fetchedCurrentZone || null);
            } else {
              setZone(null);
            }
            setHasContentChanges(false); 
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

      const fetchAllZones = async () => {
        try {
            const fetchedZones = await getZones();
            setAllZones(fetchedZones);
        } catch (e) {
            console.error("Failed to fetch zones for dropdown", e);
            toast({ title: "Error", description: "Could not load zones.", variant: "destructive" });
        }
      };
      fetchAllZones();
    }
  }, [id, toast]);

  useEffect(() => {
    if (isAddingTag && newTagInputRef.current) {
      newTagInputRef.current.focus();
    }
  }, [isAddingTag]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableTitle(e.target.value);
    setHasContentChanges(true);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableDescription(e.target.value);
    setHasContentChanges(true);
  };
  
  const handleMindNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditableMindNote(e.target.value);
    setHasContentChanges(true);
  };

  const handleZoneChange = (value: string) => {
    setEditableZoneId(value === NO_ZONE_VALUE ? undefined : value);
    setHasContentChanges(true);
  };

  const handleSaveItemChanges = async () => {
    if (!item) return;
    setIsSavingItemDetails(true);
    try {
        const updatedDetails: Partial<ContentItem> = {
            title: editableTitle,
            description: (item.type === 'link' || item.type === 'image' || item.type === 'voice') ? item.description : editableDescription, // Keep original description if read-only
            mindNote: (item.type === 'image' || item.type === 'link') ? editableMindNote : undefined,
            zoneId: editableZoneId, 
        };
        const updated = await updateContentItem(item.id, updatedDetails);
        if (updated) {
            setItem(updated); 
            if (updated.zoneId) {
                 const newCurrentZone = allZones.find(z => z.id === updated.zoneId);
                 setZone(newCurrentZone || null);
            } else {
                 setZone(null);
            }
            toast({ title: "Success", description: "Item details updated." });
            setHasContentChanges(false);
        } else {
            throw new Error("Failed to update item.");
        }
    } catch (e) {
        console.error("Error updating item details:", e);
        toast({ title: "Error", description: "Could not update item details.", variant: "destructive" });
    } finally {
        setIsSavingItemDetails(false);
    }
  };

  const handleCancelItemChanges = () => {
    if (item) {
        setEditableTitle(item.title);
        setEditableDescription(item.description || '');
        setEditableMindNote(item.mindNote || '');
        setEditableZoneId(item.zoneId);
        setHasContentChanges(false);
    }
  };

  const saveTags = async (tagsToSave: Tag[]) => {
    if (!item) return;
    setIsUpdatingTags(true);
    try {
      const updatedItem = await updateContentItem(item.id, { tags: tagsToSave });
      if (updatedItem) {
        setItem(prevItem => prevItem ? { ...prevItem, tags: updatedItem.tags || [] } : null);
        setEditableTags(updatedItem.tags || []);
        // Success toast removed as per user request
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
    const newTag: Tag = { id: Date.now().toString(), name: newTagInput.trim() }; 
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
  
  const isDescriptionReadOnly = item.type === 'link' || item.type === 'image' || item.type === 'voice';

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="shadow-xl">
        {item.imageUrl && (item.type === 'image' || item.type === 'link') && (
          <div className="relative w-full h-72 rounded-t-lg overflow-hidden">
            <Image
              src={item.imageUrl}
              alt={editableTitle}
              layout="fill"
              objectFit="cover"
              data-ai-hint={editableTitle.substring(0,20)}
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-start space-x-3 mb-2">
            <span className="mt-2">{getTypeIcon(item.type)}</span>
            <Input
                value={editableTitle}
                onChange={handleTitleChange}
                disabled={isSavingItemDetails}
                className="text-3xl font-headline font-semibold border-0 focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-0 shadow-none p-0 h-auto flex-grow"
                placeholder="Enter title"
            />
          </div>
          {item.type === 'link' && item.url && (
            <CardDescription className="text-sm text-muted-foreground flex items-center pl-8">
              <ExternalLink className="h-4 w-4 mr-2" />
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary break-all">
                {item.url}
              </a>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center">
                <Edit3 className="h-4 w-4 mr-2 text-muted-foreground"/> Description {isDescriptionReadOnly && <span className="text-xs text-muted-foreground ml-2">(Read-only)</span>}
            </h3>
            <Textarea
                value={editableDescription}
                onChange={handleDescriptionChange}
                disabled={isSavingItemDetails || isDescriptionReadOnly}
                placeholder={isDescriptionReadOnly && !editableDescription ? "No description provided." : "Enter description..."}
                className="w-full min-h-[120px] focus-visible:ring-accent"
                readOnly={isDescriptionReadOnly}
            />
          </div>

          {(item.type === 'image' || item.type === 'link') && (
             <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center">
                    <StickyNote className="h-4 w-4 mr-2 text-muted-foreground"/> Mind Note
                </h3>
                <Textarea
                    value={editableMindNote}
                    onChange={handleMindNoteChange}
                    disabled={isSavingItemDetails}
                    placeholder="Add your personal thoughts or quick notes here..."
                    className="w-full min-h-[80px] focus-visible:ring-accent"
                />
            </div>
          )}

           {item.type === 'voice' && item.audioUrl && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Voice Note</h3>
              <audio controls src={item.audioUrl} className="w-full">
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Created: {format(new Date(item.createdAt), 'MMMM d, yyyy p')}</span>
            </div>
             <div className="flex items-center space-x-2 text-muted-foreground capitalize">
                {getTypeIcon(item.type)}
                <span>Type: {item.type}</span>
              </div>
            {item.domain && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Landmark className="h-4 w-4" />
                <span>Domain: {item.domain}</span>
              </div>
            )}
            {item.contentType && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Layers className="h-4 w-4" />
                <span>Content Type: {item.contentType}</span>
              </div>
            )}
            <div className="flex items-center space-x-2 text-muted-foreground">
                <Folder className="h-4 w-4" />
                <Select
                    value={editableZoneId || NO_ZONE_VALUE} 
                    onValueChange={handleZoneChange}
                    disabled={isSavingItemDetails || allZones.length === 0}
                >
                    <SelectTrigger className="w-full md:w-[200px] h-9 text-sm focus-visible:ring-accent">
                        <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                        {allZones.map(z => (
                            <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                        ))}
                        {allZones.length === 0 && <SelectItem value="loadingzones" disabled>Loading zones...</SelectItem>}
                         <SelectItem value={NO_ZONE_VALUE}>No Zone</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
          
          {hasContentChanges && (
            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelItemChanges} disabled={isSavingItemDetails}>
                    Cancel
                </Button>
                <Button onClick={handleSaveItemChanges} disabled={isSavingItemDetails}>
                    {isSavingItemDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center">
              <TagIcon className="h-5 w-5 mr-2 text-primary" /> Tags {isUpdatingTags && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {editableTags.map(tag => (
                <Badge key={tag.id} variant="secondary" className="font-normal text-sm px-3 py-1 group relative">
                  {tag.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1.5 p-0.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive absolute -right-1 -top-1 rounded-full bg-background/50"
                    onClick={() => handleRemoveTag(tag.id)}
                    disabled={isUpdatingTags || isSavingItemDetails}
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
                    disabled={isUpdatingTags || isSavingItemDetails}
                    className="h-8 text-sm w-32 focus-visible:ring-accent"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleAddNewTag}
                    disabled={isUpdatingTags || isSavingItemDetails || newTagInput.trim() === ''}
                    aria-label="Confirm add tag"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleCancelAddTag}
                    disabled={isUpdatingTags || isSavingItemDetails}
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
                                disabled={isUpdatingTags || isSavingItemDetails}
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
            </div>
            {editableTags.length === 0 && !isAddingTag && !isUpdatingTags && (
                <p className="text-sm text-muted-foreground">No tags yet. Click '+' to add one.</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
        </CardFooter>
      </Card>
    </div>
  );
}
    

    


