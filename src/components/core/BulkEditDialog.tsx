
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X, ChevronDown, Ban, Check, Bookmark, ImageIcon } from 'lucide-react';
import type { Zone } from '@/types';
import { add } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getIconComponent } from '@/lib/icon-map';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableZones: Zone[];
  editMode: 'zone' | 'moodboard';
  onBulkEdit: (updates: {
    zoneId?: string | null;
    tagsToAdd?: string[];
    memoryNoteToAppend?: string;
    expiresAt?: string | null;
  }) => void;
  onAddToMoodboard: (moodboardId: string) => void;
  selectedCount: number;
  onZoneCreate: (zoneName: string) => Promise<Zone | null>;
}

const formSchema = z.object({
  zoneId: z.string().optional(),
  tagsToAdd: z.array(z.string()).optional(),
  memoryNoteToAppend: z.string().optional(),
  temporaryStatus: z.enum(['no-change', 'temporary', 'permanent']).default('no-change'),
  expiryDays: z.string().optional(),
});

const NO_ZONE_VALUE = "__NO_ZONE__";

export function BulkEditDialog({ open, onOpenChange, availableZones, editMode, onBulkEdit, onAddToMoodboard, selectedCount, onZoneCreate }: BulkEditDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isZonePopoverOpen, setIsZonePopoverOpen] = useState(false);
  const [zoneSearchText, setZoneSearchText] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      zoneId: undefined,
      tagsToAdd: [],
      memoryNoteToAppend: '',
      temporaryStatus: 'no-change',
      expiryDays: '30',
    },
  });

  const handleCreateZone = async (zoneName: string) => {
    if (!zoneName.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const newZone = await onZoneCreate(zoneName);
      if (newZone) {
        form.setValue('zoneId', newZone.id);
        toast({ title: "Collection Created", description: `"${newZone.name}" created and selected.` });
      }
    } catch(e) {
      toast({ title: "Error", description: "Could not create new collection.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsZonePopoverOpen(false);
      setZoneSearchText('');
    }
  };
  
  const tagsToAdd = form.watch('tagsToAdd') || [];

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setTagInput('');
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    if (editMode === 'moodboard') {
        if (!data.zoneId) {
            toast({ title: 'No Moodboard Selected', description: 'Please select a moodboard to add items to.', variant: 'destructive' });
            setIsLoading(false);
            return;
        }
        onAddToMoodboard(data.zoneId);
    } else {
        let expiresAt: string | null | undefined = undefined; // undefined means no change
        if (data.temporaryStatus === 'temporary') {
          expiresAt = add(new Date(), { days: parseInt(data.expiryDays || '30', 10) }).toISOString();
        } else if (data.temporaryStatus === 'permanent') {
          expiresAt = null; // null signals to remove the expiration
        }
        
        onBulkEdit({
          zoneId: data.zoneId === undefined ? undefined : (data.zoneId === NO_ZONE_VALUE ? null : data.zoneId),
          tagsToAdd: data.tagsToAdd,
          memoryNoteToAppend: data.memoryNoteToAppend,
          expiresAt,
        });
    }


    handleOpenChange(false);
    setIsLoading(false);
  };
  
  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !tagsToAdd.includes(newTag)) {
      form.setValue('tagsToAdd', [...tagsToAdd, newTag]);
    }
    setTagInput('');
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue('tagsToAdd', tagsToAdd.filter(tag => tag !== tagToRemove));
  };
  
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const watchedZoneId = form.watch('zoneId');
  const selectedZone = availableZones.find(z => z.id === watchedZoneId);
  const zoneDisplayName = watchedZoneId === NO_ZONE_VALUE ? "No Zone" : selectedZone?.name || `Select a ${editMode}...`;
  const ZoneDisplayIcon = editMode === 'moodboard' ? ImageIcon : getIconComponent(selectedZone?.icon || (watchedZoneId === NO_ZONE_VALUE ? 'Ban' : ''));
  const filteredZones = zoneSearchText ? availableZones.filter(z => z.name.toLowerCase().includes(zoneSearchText.toLowerCase())) : availableZones;
  const showCreateZoneOption = zoneSearchText.trim() !== '' && !filteredZones.some(z => z.name.toLowerCase() === zoneSearchText.trim().toLowerCase());

  const handleZoneInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        if (showCreateZoneOption) {
            handleCreateZone(zoneSearchText);
        }
    }
  };
  
  const title = editMode === 'zone' ? `Move ${selectedCount} Items` : `Add ${selectedCount} Items to Moodboard`;
  const description = editMode === 'zone' ? 'Re-assign the zone for all selected items. You can also add tags or notes.' : 'Choose a moodboard to add all selected items to. Items will not be removed from existing zones.';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 bg-card">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} id="bulk-edit-form" className="space-y-4">
              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editMode === 'zone' ? 'Move to Zone' : 'Select Moodboard'}</FormLabel>
                    <Popover open={isZonePopoverOpen} onOpenChange={setIsZonePopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" role="combobox" aria-expanded={isZonePopoverOpen}
                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                            <div className="flex items-center"><ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" /><span className="truncate">{zoneDisplayName}</span></div>
                            <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                           <div className="flex items-center border-b px-3">
                                <Input
                                    placeholder={`Search or create ${editMode}...`}
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
                            <CommandEmpty>No matching collections found.</CommandEmpty>
                            <CommandGroup>
                              {editMode === 'zone' && (
                                <CommandItem value={NO_ZONE_VALUE} onSelect={() => { field.onChange(NO_ZONE_VALUE); setIsZonePopoverOpen(false); }}>
                                    <Check className={cn("mr-2 h-4 w-4", field.value === NO_ZONE_VALUE ? "opacity-100" : "opacity-0")} />
                                    <Ban className="mr-2 h-4 w-4 opacity-70 text-muted-foreground" />
                                    No Zone
                                </CommandItem>
                              )}
                              {filteredZones.map((z) => {
                                const ListItemIcon = editMode === 'moodboard' ? ImageIcon : getIconComponent(z.icon);
                                return (
                                  <CommandItem key={z.id} value={z.id} onSelect={() => { field.onChange(z.id); setIsZonePopoverOpen(false); }}>
                                    <Check className={cn("mr-2 h-4 w-4", field.value === z.id ? "opacity-100" : "opacity-0")} />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {editMode === 'zone' && (
                <>
                  <FormField
                    control={form.control}
                    name="tagsToAdd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Add Tags</FormLabel>
                        <FormControl>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2 items-center p-2 rounded-md border border-input min-h-10 has-[:focus]:ring-2 has-[:focus]:ring-ring">
                              {field.value?.map(tag => (
                                <Badge key={tag} variant="secondary">
                                  {tag}
                                  <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 focus:outline-none rounded-full hover:bg-destructive/20 p-0.5"><X className="h-3 w-3" /></button>
                                </Badge>
                              ))}
                              <Input
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagInputKeyDown}
                                placeholder="Type & enter..."
                                className="h-8 flex-grow min-w-[120px] p-0 border-0 shadow-none focus-visible:ring-0 bg-transparent"
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="memoryNoteToAppend"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Append to Memory Note</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Add thoughts to all selected items..."
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button type="submit" form="bulk-edit-form" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editMode === 'zone' ? 'Apply Changes' : 'Add to Moodboard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
