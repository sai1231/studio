
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, X, ChevronDown, Bookmark, Briefcase, Home, Library, Ban, AlarmClock } from 'lucide-react';
import type { Zone, Tag } from '@/types';
import { add } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Check } from 'lucide-react';
import { Switch } from '../ui/switch';


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

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase,
  Home,
  Library,
  Bookmark,
  Ban,
};
const getIconComponent = (iconName?: string): React.ElementType => iconMap[iconName || ''] || Bookmark;
const NO_ZONE_VALUE = "__NO_ZONE__";

export function BulkEditDialog({ open, onOpenChange, availableZones, onBulkEdit, selectedCount }: BulkEditDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // State for each field
  const [zoneId, setZoneId] = useState<string | null | undefined>(undefined); // undefined means no change
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [memoryNoteToAppend, setMemoryNoteToAppend] = useState('');
  const [isTemporary, setIsTemporary] = useState<boolean | 'indeterminate'>('indeterminate');
  const [expiryDays, setExpiryDays] = useState('30');

  const [isZonePopoverOpen, setIsZonePopoverOpen] = useState(false);
  const [zoneSearchText, setZoneSearchText] = useState('');

  const resetState = () => {
    setZoneId(undefined);
    setTagsToAdd([]);
    setTagInput('');
    setMemoryNoteToAppend('');
    setIsTemporary('indeterminate');
    setExpiryDays('30');
    setIsLoading(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = () => {
    setIsLoading(true);

    let expiresAt: string | null | undefined = undefined;
    if (isTemporary === true) {
      expiresAt = add(new Date(), { days: parseInt(expiryDays, 10) }).toISOString();
    } else if (isTemporary === false) {
      expiresAt = null;
    }

    onBulkEdit({
      zoneId: zoneId,
      tagsToAdd,
      memoryNoteToAppend,
      expiresAt,
    });
    handleOpenChange(false);
  };
  
  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !tagsToAdd.includes(newTag)) {
      setTagsToAdd([...tagsToAdd, newTag]);
    }
    setTagInput('');
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTagsToAdd(tagsToAdd.filter(tag => tag !== tagToRemove));
  };
  
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const selectedZone = availableZones.find(z => z.id === zoneId);
  const zoneDisplayName = zoneId === null ? "No Zone" : selectedZone?.name || 'Change zone...';
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon || (zoneId === null ? 'Ban' : ''));
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
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Zone</Label>
            <Popover open={isZonePopoverOpen} onOpenChange={setIsZonePopoverOpen}>
              <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={isZonePopoverOpen}
                      className={cn("w-full justify-between bg-background", zoneId === undefined && "text-muted-foreground")}>
                      <div className="flex items-center"><ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" /><span className="truncate">{zoneDisplayName}</span></div>
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                      <CommandInput placeholder="Search zones..." value={zoneSearchText} onValueChange={setZoneSearchText} />
                      <CommandList>
                          <CommandEmpty>No matching zones found.</CommandEmpty>
                          <CommandGroup>
                              <CommandItem value={NO_ZONE_VALUE} onSelect={() => { setZoneId(null); setIsZonePopoverOpen(false); }}>
                                  <Check className={cn("mr-2 h-4 w-4", zoneId === null ? "opacity-100" : "opacity-0")} />
                                  <Ban className="mr-2 h-4 w-4 opacity-70 text-muted-foreground" />
                                  No Zone
                              </CommandItem>
                              {filteredZones.map((z) => {
                                  const ListItemIcon = getIconComponent(z.icon);
                                  return (
                                  <CommandItem key={z.id} value={z.id} onSelect={() => { setZoneId(z.id); setIsZonePopoverOpen(false); }}>
                                      <Check className={cn("mr-2 h-4 w-4", zoneId === z.id ? "opacity-100" : "opacity-0")} />
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
          </div>
          <div className="space-y-2">
            <Label>Add Tags</Label>
            <div className="flex flex-wrap gap-2 items-center p-2 rounded-md border border-input min-h-10 bg-background has-[:focus]:ring-2 has-[:focus]:ring-ring">
              {tagsToAdd.map(tag => (
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
           <div className="space-y-2">
            <Label>Append to Memory Note</Label>
            <Textarea
              value={memoryNoteToAppend}
              onChange={(e) => setMemoryNoteToAppend(e.target.value)}
              placeholder="Add thoughts to all selected items..."
              className="min-h-[80px] bg-background"
            />
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-0.5">
                  <label htmlFor="bulk-temporary-switch" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Temporary Content
                  </label>
                  <p className="text-xs text-muted-foreground">"On" sets an expiration, "Off" removes it.</p>
              </div>
              <Switch id="bulk-temporary-switch"
                checked={isTemporary === true}
                onCheckedChange={(checked) => setIsTemporary(checked)}
                data-state={isTemporary === 'indeterminate' ? 'indeterminate' : (isTemporary ? 'checked' : 'unchecked')}
                className="data-[state=indeterminate]:bg-muted-foreground"
              />
            </div>
            {isTemporary === true && (
              <div className="flex items-center gap-2">
                 <Label htmlFor="expiry-select" className="sr-only">Expiration</Label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger id="expiry-select" className="flex-grow bg-background focus:ring-accent"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Delete after 7 days</SelectItem>
                    <SelectItem value="30">Delete after 30 days</SelectItem>
                    <SelectItem value="90">Delete after 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
