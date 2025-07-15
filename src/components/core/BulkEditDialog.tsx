
'use client';

import React, { useState, useEffect } from 'react';
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
import { Loader2, Plus, X, ChevronDown, Bookmark, Ban } from 'lucide-react';
import type { Zone } from '@/types';
import { add } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Check } from 'lucide-react';
import { Switch } from '../ui/switch';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getIconComponent } from '@/lib/icon-map';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableZones: Zone[];
  onBulkEdit: (updates: {
    zoneId?: string | null;
    tagsToAdd?: string[];
    memoryNoteToAppend?: string;
    expiresAt?: string | null;
  }) => void;
  selectedCount: number;
}

const formSchema = z.object({
  zoneId: z.string().optional(),
  tagsToAdd: z.array(z.string()).optional(),
  memoryNoteToAppend: z.string().optional(),
  isTemporary: z.enum(['indeterminate', 'on', 'off']).default('indeterminate'),
  expiryDays: z.string().optional(),
});

const NO_ZONE_VALUE = "__NO_ZONE__";

export function BulkEditDialog({ open, onOpenChange, availableZones, onBulkEdit, selectedCount }: BulkEditDialogProps) {
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
      isTemporary: 'indeterminate',
      expiryDays: '30',
    },
  });

  // This function was missing but is needed for the create zone flow
  const handleCreateZone = async (zoneName: string) => {
    toast({ title: "Feature not implemented", description: "Creating zones from this dialog is not yet supported." });
  };
  
  const isTemporary = form.watch('isTemporary');
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

    let expiresAt: string | null | undefined = undefined; // undefined means no change
    if (data.isTemporary === 'on') {
      expiresAt = add(new Date(), { days: parseInt(data.expiryDays || '30', 10) }).toISOString();
    } else if (data.isTemporary === 'off') {
      expiresAt = null; // Explicitly remove expiration
    }
    
    onBulkEdit({
      zoneId: data.zoneId === undefined ? undefined : (data.zoneId === NO_ZONE_VALUE ? null : data.zoneId),
      tagsToAdd: data.tagsToAdd,
      memoryNoteToAppend: data.memoryNoteToAppend,
      expiresAt,
    });

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
  const zoneDisplayName = watchedZoneId === NO_ZONE_VALUE ? "No Zone" : selectedZone?.name || 'Change zone...';
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon || (watchedZoneId === NO_ZONE_VALUE ? 'Ban' : ''));
  const filteredZones = zoneSearchText ? availableZones.filter(z => z.name.toLowerCase().includes(zoneSearchText.toLowerCase())) : availableZones;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedCount} Items</DialogTitle>
          <DialogDescription>
            Apply changes to all selected items. Fields left blank will not be changed.
          </DialogDescription>
        </DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} id="bulk-edit-form" className="space-y-4">
                  <FormField
                      control={form.control}
                      name="zoneId"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Zone</FormLabel>
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
                                  <CommandInput placeholder="Search zones..." value={zoneSearchText} onValueChange={setZoneSearchText} />
                                  <CommandList>
                                      <CommandEmpty>No matching zones found.</CommandEmpty>
                                      <CommandGroup>
                                          <CommandItem value={NO_ZONE_VALUE} onSelect={() => { field.onChange(NO_ZONE_VALUE); setIsZonePopoverOpen(false); }}>
                                              <Check className={cn("mr-2 h-4 w-4", field.value === NO_ZONE_VALUE ? "opacity-100" : "opacity-0")} />
                                              <Ban className="mr-2 h-4 w-4 opacity-70 text-muted-foreground" />
                                              No Zone
                                          </CommandItem>
                                          {filteredZones.map((z) => {
                                              const ListItemIcon = getIconComponent(z.icon);
                                              return (
                                              <CommandItem key={z.id} value={z.id} onSelect={() => { field.onChange(z.id); setIsZonePopoverOpen(false); }}>
                                                  <Check className={cn("mr-2 h-4 w-4", field.value === z.id ? "opacity-100" : "opacity-0")} />
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
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  
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

                  <div className="space-y-3 pt-2">
                      <FormField
                          control={form.control}
                          name="isTemporary"
                          render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                  <FormLabel>Temporary Content</FormLabel>
                                  <p className="text-xs text-muted-foreground">"On" sets an expiration, "Off" removes it.</p>
                              </div>
                              <FormControl>
                                  <Switch
                                      checked={field.value === 'on'}
                                      onCheckedChange={(checked) => field.onChange(checked ? 'on' : 'off')}
                                      data-state={field.value}
                                      className="data-[state=indeterminate]:bg-muted-foreground"
                                  />
                              </FormControl>
                          </FormItem>
                          )}
                      />
                      {isTemporary === 'on' && (
                          <FormField
                              control={form.control}
                              name="expiryDays"
                              render={({ field }) => (
                              <FormItem>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                          <SelectTrigger><SelectValue placeholder="Select expiration" /></SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          <SelectItem value="7">Delete after 7 days</SelectItem>
                                          <SelectItem value="30">Delete after 30 days</SelectItem>
                                          <SelectItem value="90">Delete after 90 days</SelectItem>
                                      </SelectContent>
                                  </Select>
                              </FormItem>
                              )}
                          />
                      )}
                  </div>
              </form>
          </Form>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button type="submit" form="bulk-edit-form" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
