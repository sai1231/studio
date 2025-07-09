

'use client';

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Plus, Check, ChevronDown, Bookmark, Briefcase, Home, Library } from 'lucide-react';
import { motion } from 'framer-motion';
import { Separator } from '../ui/separator';
import type { Zone, ContentItem, Tag } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Loader2, X } from 'lucide-react';
import { addContentItem, updateContentItem } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';


interface FocusModeDialogProps {
  item: ContentItem | null;
  onClose: () => void;
  zones: Zone[];
  onZoneCreate: (zoneName: string) => Promise<Zone | null>;
}

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase,
  Home,
  Library,
  Bookmark,
};

const getIconComponent = (iconName?: string): React.ElementType => {
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }
  return Bookmark;
};

const FocusModeDialog: React.FC<FocusModeDialogProps> = ({ item, onClose, zones, onZoneCreate }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>();
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [isZonePopoverOpen, setIsZonePopoverOpen] = useState(false);
  const [zoneSearchText, setZoneSearchText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Write something amazing...',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none max-w-full',
      },
    },
    autofocus: true,
  });

  useEffect(() => {
    if (item && editor) {
      editor.commands.setContent(item.description || '');
      setSelectedZoneId(item.zoneId);
      setCurrentTags(item.tags || []);
    } else if (!item && editor) {
      editor.commands.clearContent();
      setSelectedZoneId(undefined);
      setCurrentTags([]);
    }
  }, [item, editor]);
  
  const handleCreateZone = async (zoneName: string) => {
    if (!zoneName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const newZone = await onZoneCreate(zoneName);
      if (newZone) {
        setSelectedZoneId(newZone.id);
      }
    } catch(e) {
        toast({ title: "Error", description: "Could not create new zone.", variant: "destructive" });
    } finally {
      setIsSaving(false);
      setIsZonePopoverOpen(false);
      setZoneSearchText('');
    }
  };


  const handleSave = async () => {
    if (!editor || !user) return;
    const content = editor.getHTML();
    const textContent = editor.getText();

    if (!textContent.trim()) {
      toast({
        title: "Content is empty",
        description: "Please write something before saving.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
        if (item) { // This is an update
            await updateContentItem(item.id, {
                description: content,
                tags: currentTags,
                zoneId: selectedZoneId
            });
            toast({ title: "Note Updated" });
        } else { // This is a new creation
            const generatedTitle = textContent.split(/\s+/).slice(0, 5).join(' ') + (textContent.split(/\s+/).length > 5 ? '...' : '');
            const contentData: Omit<ContentItem, 'id' | 'createdAt'> = {
                type: 'note',
                title: generatedTitle || 'Untitled Note',
                description: content,
                contentType: 'Note',
                status: 'pending-analysis',
                tags: currentTags,
                zoneId: selectedZoneId,
                userId: user.uid,
            };
            await addContentItem(contentData);
            toast({ title: "Note Saved" });
        }
        onClose();
    } catch (error) {
        console.error("Error saving from focus mode:", error);
        toast({
            title: "Error Saving",
            description: "Could not save your note.",
            variant: "destructive"
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !currentTags.find(tag => tag.name.toLowerCase() === tagInput.trim().toLowerCase())) {
      setCurrentTags([...currentTags, { id: Date.now().toString(), name: tagInput.trim() }]);
    }
    setTagInput('');
  };
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag(); }
  };
  const removeTag = (tagToRemove: Tag) => setCurrentTags(currentTags.filter(tag => tag.id !== tagToRemove.id));

  if (!editor) {
    return null;
  }

  const dialogVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon);
  const zoneDisplayName = selectedZone?.name || 'Select a zone';
  const filteredZones = zoneSearchText ? zones.filter(z => z.name.toLowerCase().includes(zoneSearchText.toLowerCase())) : zones;

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="bg-transparent border-0 shadow-none p-0 flex items-center justify-center w-full h-full max-w-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <motion.div
            variants={dialogVariants} 
            initial="hidden" 
            animate="visible" 
            exit="exit" 
            className="w-[95vw] max-w-7xl h-[95vh] flex flex-col p-0 bg-card rounded-lg shadow-2xl"
        >
            <DialogHeader className="p-4 border-b flex-shrink-0">
              <DialogTitle className="font-headline">Focus Mode</DialogTitle>
            </DialogHeader>
            
            <div className="flex-grow overflow-y-auto p-8 md:p-12">
                <EditorContent editor={editor} />
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                    <ToggleGroup type="multiple" className="bg-background border rounded-md shadow-lg p-1">
                        <ToggleGroupItem value="bold" aria-label="Toggle bold" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive('bold')}>
                            <Bold className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="italic" aria-label="Toggle italic" onClick={() => editor.chain().focus().toggleItalic().run()} data-active={editor.isActive('italic')}>
                            <Italic className="h-4 w-4" />
                        </ToggleGroupItem>
                         <ToggleGroupItem value="underline" aria-label="Toggle underline" onClick={() => editor.chain().focus().toggleUnderline().run()} data-active={editor.isActive('underline')}>
                            <UnderlineIcon className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="strike" aria-label="Toggle strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} data-active={editor.isActive('strike')}>
                            <Strikethrough className="h-4 w-4" />
                        </ToggleGroupItem>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <ToggleGroupItem value="code" aria-label="Toggle code" onClick={() => editor.chain().focus().toggleCode().run()} data-active={editor.isActive('code')}>
                            <Code className="h-4 w-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                </BubbleMenu>
            </div>

            <DialogFooter className="p-4 border-t flex-shrink-0 flex items-center justify-between w-full">
                <div className="flex items-center gap-2 flex-wrap">
                    <Popover open={isZonePopoverOpen} onOpenChange={setIsZonePopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isZonePopoverOpen}
                                className={cn("w-[200px] justify-between", !selectedZoneId && "text-muted-foreground")}>
                                <div className="flex items-center"><ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" /><span className="truncate">{zoneDisplayName}</span></div>
                                <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                            <Command>
                                <CommandInput placeholder="Search or create zone..." value={zoneSearchText} onValueChange={setZoneSearchText} />
                                <CommandList>
                                <CommandEmpty>
                                    <div className="py-6 text-center text-sm">{zoneSearchText.trim() === '' ? 'No zones found.' : 'No matching zones found.'}</div>
                                </CommandEmpty>
                                <CommandGroup>
                                    {filteredZones.map((z) => {
                                        const ListItemIcon = getIconComponent(z.icon);
                                        return (
                                        <CommandItem key={z.id} value={z.id} onSelect={() => { setSelectedZoneId(z.id); setIsZonePopoverOpen(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", selectedZoneId === z.id ? "opacity-100" : "opacity-0")} />
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
                    
                    <div className="flex items-center gap-2 border rounded-md pl-3 has-[:focus]:ring-2 has-[:focus]:ring-ring">
                         {currentTags.map(tag => (
                            <Badge key={tag.id} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                {tag.name}
                                <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 focus:outline-none rounded-full hover:bg-destructive/20 p-0.5"><X className="h-3 w-3" /></button>
                            </Badge>
                         ))}
                        <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagInputKeyDown}
                            placeholder="Add tags..."
                            className="h-8 border-0 shadow-none focus-visible:ring-0 p-0 flex-1 min-w-[100px]"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Done
                    </Button>
                </div>
            </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default FocusModeDialog;
