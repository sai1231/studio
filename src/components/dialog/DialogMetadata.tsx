
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, X, Check, ChevronDown, Ban, Briefcase, Home, Library, Bookmark, Pencil, AlarmClock } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Zone, Tag } from '@/types';

interface DialogMetadataProps {
  isSaving: boolean;
  
  // Zone Props
  allZones: Zone[];
  editableZoneId?: string;
  isZoneComboboxOpen: boolean;
  onZoneComboboxOpenChange: (open: boolean) => void;
  zoneComboboxSearchText: string;
  onZoneComboboxSearchTextChange: (text: string) => void;
  handleZoneSelection: (zoneId?: string) => void;
  handleCreateZone: (zoneName: string) => void;

  // Tag Props
  editableTags: Tag[];
  isAddingTag: boolean;
  onIsAddingTagChange: (adding: boolean) => void;
  newTagInput: string;
  onNewTagInputChange: (input: string) => void;
  handleAddNewTag: () => void;
  handleTagInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleRemoveTag: (tagId: string) => void;
  newTagInputRef: React.RefObject<HTMLInputElement>;
  
  // Temporary Memory Props
  isTemporary: boolean;
  onTemporaryToggle: (checked: boolean) => void;
  expirySelection: string;
  onExpiryChange: (value: string) => void;
  customExpiryDays: string;
  onCustomExpiryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Memory Note Props
  editableMemoryNote: string;
  onMemoryNoteChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onMemoryNoteBlur: () => void;
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
  return Bookmark;
};

const NO_ZONE_VALUE = "__NO_ZONE__";

export const DialogMetadata: React.FC<DialogMetadataProps> = (props) => {
  const {
    isSaving,
    allZones, editableZoneId, isZoneComboboxOpen, onZoneComboboxOpenChange, zoneComboboxSearchText, onZoneComboboxSearchTextChange, handleZoneSelection, handleCreateZone,
    editableTags, isAddingTag, onIsAddingTagChange, newTagInput, onNewTagInputChange, handleAddNewTag, handleTagInputKeyDown, handleRemoveTag, newTagInputRef,
    isTemporary, onTemporaryToggle, expirySelection, onExpiryChange, customExpiryDays, onCustomExpiryChange,
    editableMemoryNote, onMemoryNoteChange, onMemoryNoteBlur
  } = props;

  const selectedZone = allZones.find(z => z.id === editableZoneId);
  const zoneDisplayName = selectedZone?.name || "No zone";
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon);
  const filteredZones = zoneComboboxSearchText ? allZones.filter(z => z.name.toLowerCase().includes(zoneComboboxSearchText.toLowerCase())) : allZones;
  const showCreateZoneButton = zoneComboboxSearchText.trim() !== '' && !allZones.some(z => z.name.toLowerCase() === zoneComboboxSearchText.trim().toLowerCase());

  const handleZoneInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showCreateZoneButton) {
        handleCreateZone(zoneComboboxSearchText);
      }
    }
  };
  
  const handleCancelAddTag = () => {
    onNewTagInputChange('');
    onIsAddingTagChange(false);
  }

  return (
    <div className="space-y-4 pt-2">
      <Popover open={isZoneComboboxOpen} onOpenChange={onZoneComboboxOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={isZoneComboboxOpen} className={cn("w-full justify-between", isSaving ? "opacity-50" : "", !editableZoneId && "text-muted-foreground")} disabled={isSaving}>
            <div className="flex items-center"><ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" /><span className="truncate">{zoneDisplayName}</span></div><ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <div className="flex items-center border-b px-3">
              <Input 
                placeholder="Search or create zone..." 
                value={zoneComboboxSearchText} 
                onChange={(e) => onZoneComboboxSearchTextChange(e.target.value)} 
                onKeyDown={handleZoneInputKeyDown} 
                className="h-9 w-full border-0 bg-transparent pl-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("ml-2", !showCreateZoneButton && "hidden")} 
                onClick={() => handleCreateZone(zoneComboboxSearchText)}
              >
                Create
              </Button>
            </div>
            <CommandList>
              <CommandEmpty>No matching zones found.</CommandEmpty>
              <CommandGroup>
                <CommandItem value={NO_ZONE_VALUE} onSelect={() => handleZoneSelection(undefined)}>
                  <Check className={cn("mr-2 h-4 w-4", !editableZoneId ? "opacity-100" : "opacity-0")} />
                  <Ban className="mr-2 h-4 w-4 opacity-70 text-muted-foreground" />
                  No Zone Assigned
                </CommandItem>
                {filteredZones.map((z) => {
                  const ListItemIcon = getIconComponent(z.icon);
                  return (
                    <CommandItem key={z.id} value={z.id} onSelect={(currentValue) => {handleZoneSelection(currentValue === editableZoneId ? undefined : currentValue);}}>
                      <Check className={cn("mr-2 h-4 w-4", editableZoneId === z.id ? "opacity-100" : "opacity-0")} />
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

      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-sm font-medium mr-2">Tags:</Label>
        {editableTags.map(tag => (<Badge key={tag.id} variant="secondary" className="px-3 py-1 text-sm rounded-full font-medium group relative">{tag.name}<Button variant="ghost" size="icon" className="h-5 w-5 ml-1.5 p-0.5 opacity-50 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive absolute -right-1.5 -top-1.5 rounded-full bg-background/50" onClick={() => handleRemoveTag(tag.id)} aria-label={`Remove tag ${tag.name}`}><X className="h-3 w-3" /></Button></Badge>))}
        {isAddingTag ? (<div className="flex items-center gap-1"><Input ref={newTagInputRef} value={newTagInput} onChange={(e) => onNewTagInputChange(e.target.value)} placeholder="New tag" onKeyDown={handleTagInputKeyDown} className="h-8 text-sm w-32 focus-visible:ring-accent" autoFocus /><Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAddNewTag} disabled={newTagInput.trim() === ''} aria-label="Confirm add tag" ><Check className="h-4 w-4 text-green-600" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelAddTag} aria-label="Cancel add tag" ><X className="h-4 w-4 text-destructive" /></Button></div>) : (<TooltipProvider><Tooltip><TooltipTrigger asChild><Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => onIsAddingTagChange(true)} aria-label="Add new tag" ><Plus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Add new tag</p></TooltipContent></Tooltip></TooltipProvider>)}
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between"><label htmlFor="temporary-switch" className="font-medium text-foreground">Temporary Memory</label><Switch id="temporary-switch" checked={isTemporary} onCheckedChange={onTemporaryToggle} /></div>
        {isTemporary && (
          <div className="flex items-center gap-2">
            <Select value={expirySelection} onValueChange={onExpiryChange}>
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
                <Input type="number" value={customExpiryDays} onChange={onCustomExpiryChange} className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Pencil className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Memory Note</h3>
        </div>
        <Textarea
          value={editableMemoryNote}
          onChange={onMemoryNoteChange}
          onBlur={onMemoryNoteBlur}
          placeholder="Add your personal thoughts..."
          className="w-full min-h-[120px] focus-visible:ring-accent bg-muted/30 dark:bg-muted/20 border-border"
        />
      </div>
    </div>
  );
};
