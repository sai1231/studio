

'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getContentItemById, updateContentItem, getZones, addZone, moveItemToTrash } from '@/services/contentService';
import type { ContentItem, Zone, Tag } from '@/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { add, differenceInMinutes } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { DialogVisuals } from '@/components/dialog/DialogVisuals';
import { DialogHeaderSection } from '@/components/dialog/DialogHeaderSection';
import { DialogDescription } from '@/components/dialog/DialogDescription';
import { DialogMetadata } from '@/components/dialog/DialogMetadata';
import { DialogFooterActions } from '@/components/dialog/DialogFooterActions';
import { reEnrichContentAction } from '@/app/actions/enrichmentActions';


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
  const [editableMemoryNote, setEditableMemoryNote] = useState('');
  const [editableZoneId, setEditableZoneId] = useState<string | undefined>(undefined);

  const [allZones, setAllZones] = useState<Zone[]>([]);

  const [editableTags, setEditableTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  const [isZoneComboboxOpen, setIsZoneComboboxOpen] = useState(false);
  const [zoneComboboxSearchText, setZoneComboboxSearchText] = useState('');

  const [isTemporary, setIsTemporary] = useState(false);
  const [expirySelection, setExpirySelection] = useState<string>('30');
  const [customExpiryDays, setCustomExpiryDays] = useState<string>('30');
  const [isSaving, setIsSaving] = useState(false);
  
  const [oembedHtml, setOembedHtml] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchFullItem = useCallback(async (itemId: string) => {
    if (!user) return;
    try {
      const [freshItem, fetchedZones] = await Promise.all([
        getContentItemById(itemId),
        getZones(user.uid)
      ]);
      
      if (freshItem) {
        setItem(freshItem);
        const regularZones = fetchedZones.filter(z => !z.isMoodboard);
        setAllZones(regularZones);
        const assignedRegularZoneId = freshItem.zoneIds?.find(id => regularZones.some(z => z.id === id));
        setEditableZoneId(assignedRegularZoneId);
      } else {
        setError('Item not found.');
        onOpenChange(false);
      }
    } catch (e) {
      console.error('Error fetching fresh item details:', e);
      setError('Failed to load fresh details.');
    }
  }, [user, onOpenChange]);

  useEffect(() => {
    if (open && initialItem) {
      setItem(initialItem); 
      setIsLoading(false); 
      setError(null);
      setOembedHtml(null); 
      fetchFullItem(initialItem.id);
    } else if (!open) {
      setItem(null);
      setIsLoading(true); 
      setError(null);
      setOembedHtml(null);
    }
  }, [initialItem, open, fetchFullItem]); 

  useEffect(() => {
    if (item) {
      setEditableTitle(item.title);
      setEditableMemoryNote(item.memoryNote || '');
      setEditableTags(item.tags || []);
      setIsTemporary(!!item.expiresAt);
    }
  }, [item]);

  useEffect(() => {
    if (isAddingTag && newTagInputRef.current) {
      newTagInputRef.current.focus();
    }
  }, [isAddingTag]);
  
  const handleDelete = async () => {
    if (!item || !onItemDelete) return;
    await moveItemToTrash(item.id);
    onItemDelete(item.id);
    onOpenChange(false);
  };

  const handleFieldUpdate = useCallback(async (
    fieldName: keyof Pick<ContentItem, 'title' | 'memoryNote' | 'zoneIds' | 'expiresAt' | 'tags'>,
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

  const handleTitleBlur = () => {
    if (item && editableTitle !== item.title) {
      handleFieldUpdate('title', editableTitle);
    }
  };

  const handleMemoryNoteBlur = () => {
    if (item && editableMemoryNote !== (item.memoryNote || '')) {
      handleFieldUpdate('memoryNote', editableMemoryNote);
    }
  };

  const handleZoneSelection = async (selectedZoneValue?: string) => {
    setIsZoneComboboxOpen(false);
    setZoneComboboxSearchText('');
    
    const newZoneId = selectedZoneValue === undefined ? undefined : selectedZoneValue;
    if (item && editableZoneId !== newZoneId) {
        const otherMoodboardIds = item.zoneIds?.filter(id => !allZones.some(z => z.id === id)) || [];
        const newZoneIds = newZoneId ? [newZoneId, ...otherMoodboardIds] : otherMoodboardIds;
        await handleFieldUpdate('zoneIds', newZoneIds);
    }
    setEditableZoneId(newZoneId);
  };

  const handleCreateZone = async (zoneName: string) => {
    if (!zoneName.trim() || !user) return;
    setIsSaving(true);
    try {
      const newZone = await addZone(zoneName.trim(), user.uid);
      setAllZones(prev => [...prev, newZone]); 
      
      const otherMoodboardIds = item?.zoneIds?.filter(id => !allZones.some(z => z.id === id)) || [];
      const newZoneIds = [newZone.id, ...otherMoodboardIds];
      await handleFieldUpdate('zoneIds', newZoneIds);

      setEditableZoneId(newZone.id);
      toast({ title: "Zone Created", description: `Zone "${newZone.name}" created and assigned.` });
    } catch (e) {
      console.error('Error creating zone:', e);
      toast({ title: "Error", description: "Could not create new zone.", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setIsZoneComboboxOpen(false);
      setZoneComboboxSearchText('');
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
  
  const handleRetryClick = async () => {
    if (!item) return;
    setIsRetrying(true);
    toast({ title: 'Retrying Analysis...', description: 'Please wait a moment.' });
    try {
        await reEnrichContentAction(item.id);
        // After triggering, we need to poll or listen for the status change.
        // For simplicity, we'll just wait a bit and then refetch.
        setTimeout(() => {
            fetchFullItem(item.id).then(() => {
                toast({ title: 'Success!', description: 'Analysis has been re-triggered.' });
                setIsRetrying(false);
                if (onItemUpdate) onItemUpdate({ ...item, status: 'pending-analysis' });
            });
        }, 3000); // Wait 3 seconds before refetching.
    } catch (e) {
        toast({ title: 'Error', description: 'Could not retry analysis.', variant: 'destructive' });
        setIsRetrying(false);
    }
  };

  const shouldShowRetry = item && (item.status === 'failed-analysis' || (item.status === 'pending-analysis' && differenceInMinutes(new Date(), new Date(item.createdAt)) >= 1));
  const hasVisual = item?.imageUrl || oembedHtml || (item?.contentType === 'PDF' && item?.url) || (item?.type === 'voice' && item.audioUrl);
    
  const DialogBody = (
    <>
      <DialogTitle className="sr-only">Details for {item?.title || 'content item'}</DialogTitle>
      <div className={cn(
        "grid flex-grow overflow-hidden",
        hasVisual ? "md:grid-cols-2" : "md:grid-cols-1"
      )}>
        {item && hasVisual && <DialogVisuals item={item} onOembedLoad={setOembedHtml} />}

        <div className={cn(
          "flex flex-col bg-card text-card-foreground shadow-lg overflow-hidden relative",
          !hasVisual && "md:col-span-2"
        )}>
            <ScrollArea className="flex-grow">
              <div className="p-6 space-y-4">
                {item && <DialogHeaderSection 
                    item={item} 
                    editableTitle={editableTitle}
                    onTitleChange={(e) => setEditableTitle(e.target.value)}
                    onTitleBlur={handleTitleBlur}
                />}

                {item && item.description && <DialogDescription description={item.description} />}
                
                <DialogMetadata 
                    isSaving={isSaving}
                    allZones={allZones}
                    editableZoneId={editableZoneId}
                    isZoneComboboxOpen={isZoneComboboxOpen}
                    onZoneComboboxOpenChange={setIsZoneComboboxOpen}
                    zoneComboboxSearchText={zoneComboboxSearchText}
                    onZoneComboboxSearchTextChange={setZoneComboboxSearchText}
                    handleZoneSelection={handleZoneSelection}
                    handleCreateZone={handleCreateZone}
                    editableTags={editableTags}
                    isAddingTag={isAddingTag}
                    onIsAddingTagChange={setIsAddingTag}
                    newTagInput={newTagInput}
                    onNewTagInputChange={setNewTagInput}
                    handleAddNewTag={handleAddNewTag}
                    handleTagInputKeyDown={handleTagInputKeyDown}
                    handleRemoveTag={handleRemoveTag}
                    newTagInputRef={newTagInputRef}
                    isTemporary={isTemporary}
                    onTemporaryToggle={handleTemporaryToggle}
                    expirySelection={expirySelection}
                    onExpiryChange={handleExpiryChange}
                    customExpiryDays={customExpiryDays}
                    onCustomExpiryChange={handleCustomExpiryChange}
                    editableMemoryNote={editableMemoryNote}
                    onMemoryNoteChange={(e) => setEditableMemoryNote(e.target.value)}
                    onMemoryNoteBlur={onMemoryNoteBlur}
                />
              </div>
            </ScrollArea>
             {item && <DialogFooterActions 
                item={item} 
                onDelete={handleDelete} 
                onOpenChange={onOpenChange} 
                shouldShowRetry={shouldShowRetry}
                isRetrying={isRetrying}
                handleRetryClick={handleRetryClick}
             />}
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
