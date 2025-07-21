
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Plus, Check, ChevronDown, Bookmark, ListChecks, Type, Pilcrow, List, ListOrdered, CheckSquare, Quote, GripVertical, PanelRightOpen, PanelRightClose, Pencil } from 'lucide-react';
import type { Zone, ContentItem, Tag } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Loader2, X } from 'lucide-react';
import { addContentItem, updateContentItem, getContentItemById } from '@/services/contentService';
import { useAuth } from '@/context/AuthContext';
import TurndownService from 'turndown';
import { marked } from 'marked';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { getIconComponent } from '@/lib/icon-map';
import { Textarea } from '@/components/ui/textarea';


interface FocusModeDialogProps {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: Zone[];
  onZoneCreate: (zoneName: string) => Promise<Zone | null>;
}

const turndownService = new TurndownService();

const FocusModeDialog: React.FC<FocusModeDialogProps> = ({ item, open, onOpenChange, zones, onZoneCreate }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
  const [internalItem, setInternalItem] = useState<ContentItem | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>();
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [memoryNote, setMemoryNote] = useState('');
  
  const [isZonePopoverOpen, setIsZonePopoverOpen] = useState(false);
  const [zoneSearchText, setZoneSearchText] = useState('');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: '' }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-lg focus:outline-none max-w-full my-0',
      },
    },
    autofocus: true,
  });

  useEffect(() => {
    if (open && editor) {
      if (!item) {
        editor.commands.setContent('<h1></h1><p></p>');
        setSelectedZoneId(undefined);
        setCurrentTags([]);
        setMemoryNote('');
        setInternalItem(null);
      } else {
        getContentItemById(item.id).then(freshItem => {
          if (freshItem) {
            setInternalItem(freshItem);
            const html = marked.parse(freshItem.description || '') as string;
            // Prepend title if it exists
            const fullHtml = `<h1>${freshItem.title || 'Untitled'}</h1>${html}`;
            editor.commands.setContent(fullHtml, false);
            setSelectedZoneId(freshItem.zoneIds?.[0]);
            setCurrentTags(freshItem.tags || []);
            setMemoryNote(freshItem.memoryNote || '');
          } else {
            toast({ title: "Note not found", description: "This note may have been deleted.", variant: "destructive" });
            onOpenChange(false);
          }
        });
      }
      editor.commands.focus('end');
      setIsSidebarOpen(true);
    }
  }, [item, open, editor, toast, onOpenChange]);
  
  const handleCreateZone = async (zoneName: string) => {
    if (!zoneName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const newZone = await onZoneCreate(zoneName);
      if (newZone) setSelectedZoneId(newZone.id);
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
    
    let htmlContent = editor.getHTML();
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const h1Element = tempDiv.querySelector('h1');
    let title = 'Untitled Note';
    if (h1Element && h1Element.textContent?.trim()) {
        title = h1Element.textContent.trim();
        h1Element.remove();
    } else {
       const firstText = editor.getText().split('\n')[0]?.trim();
       if(firstText) title = firstText.split(/\s+/).slice(0, 5).join(' ') + (firstText.split(/\s+/).length > 5 ? '...' : '');
    }

    const descriptionHtml = tempDiv.innerHTML;
    const markdownContent = turndownService.turndown(descriptionHtml);

    if (!editor.getText().trim()) {
      toast({ title: "Content is empty", description: "Please write something before saving.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    
    try {
        const payload = {
            title: title,
            description: markdownContent,
            tags: currentTags,
            zoneIds: selectedZoneId ? [selectedZoneId] : [],
            memoryNote: memoryNote,
        };

        if (internalItem) {
            await updateContentItem(internalItem.id, payload);
            toast({ title: "Note Updated" });
        } else {
            const contentData: Omit<ContentItem, 'id' | 'createdAt'> = {
                type: 'note',
                contentType: 'Note',
                status: 'pending-analysis',
                userId: user.uid,
                ...payload
            };
            await addContentItem(contentData);
            toast({ title: "Note Saved" });
        }
        onOpenChange(false);
    } catch (error) {
        console.error("Error saving from focus mode:", error);
        toast({ title: "Error Saving", description: "Could not save your note.", variant: "destructive" });
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

  if (!editor) return null;

  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon);
  const zoneDisplayName = selectedZone?.name || 'Select a zone';
  const filteredZones = zoneSearchText ? zones.filter(z => z.name.toLowerCase().includes(zoneSearchText.toLowerCase())) : zones;
  const showCreateZoneOption = zoneSearchText.trim() !== '' && !zones.some(z => z.name.toLowerCase() === zoneSearchText.trim().toLowerCase());
  
  const blockMenuItems = [
    { name: 'Text', icon: Pilcrow, command: () => editor.chain().focus().setParagraph().run(), isActive: () => editor.isActive('paragraph') },
    { name: 'Heading 1', icon: Type, command: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive('heading', { level: 1 }) },
    { name: 'Heading 2', icon: Type, command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive('heading', { level: 2 }) },
    { name: 'Bullet List', icon: List, command: () => editor.chain().focus().toggleBulletList().run(), isActive: () => editor.isActive('bulletList') },
    { name: 'Numbered List', icon: ListOrdered, command: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive('orderedList') },
    { name: 'Task List', icon: CheckSquare, command: () => editor.chain().focus().toggleTaskList().run(), isActive: () => editor.isActive('taskList') },
    { name: 'Blockquote', icon: Quote, command: () => editor.chain().focus().toggleBlockquote().run(), isActive: () => editor.isActive('blockquote') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-7xl h-[95vh] flex p-0 bg-card"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <DialogHeader className="p-4 border-b flex-shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="font-headline">Focus Mode</DialogTitle>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <PanelRightClose /> : <PanelRightOpen />}
                </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto p-8 md:p-12 relative">
              <div className='h-full'>
                  <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                      <ToggleGroup type="multiple" className="bg-background border rounded-md shadow-lg p-1">
                          <ToggleGroupItem value="bold" aria-label="Toggle bold" onClick={() => editor.chain().focus().toggleBold().run()} data-state={editor.isActive('bold') ? 'on' : 'off'}>
                              <Bold className="h-4 w-4" />
                          </ToggleGroupItem>
                          <ToggleGroupItem value="italic" aria-label="Toggle italic" onClick={() => editor.chain().focus().toggleItalic().run()} data-state={editor.isActive('italic') ? 'on' : 'off'}>
                              <Italic className="h-4 w-4" />
                          </ToggleGroupItem>
                            <ToggleGroupItem value="underline" aria-label="Toggle underline" onClick={() => editor.chain().focus().toggleUnderline().run()} data-state={editor.isActive('underline') ? 'on' : 'off'}>
                              <UnderlineIcon className="h-4 w-4" />
                          </ToggleGroupItem>
                          <ToggleGroupItem value="strike" aria-label="Toggle strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} data-state={editor.isActive('strike') ? 'on' : 'off'}>
                              <Strikethrough className="h-4 w-4" />
                          </ToggleGroupItem>
                      </ToggleGroup>
                  </BubbleMenu>

                  <FloatingMenu
                      editor={editor}
                      tippyOptions={{ duration: 100, placement: 'left' }}
                      shouldShow={({ state }) => {
                          const { $from } = state.selection;
                          const ankerNode = $from.parent;
                          const isAnkerNodeEmpty = ankerNode.isLeaf || !ankerNode.textContent.length;
                          return isAnkerNodeEmpty && ankerNode.type.name !== 'heading';
                      }}
                      className="block-menu"
                  >
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full border bg-background shadow-sm text-muted-foreground h-8 w-8">
                                  <Plus className="h-5 w-5" />
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-60 p-1">
                              <Command>
                                  <CommandInput placeholder="Search blocks..." />
                                  <CommandList>
                                      <CommandEmpty>No results found.</CommandEmpty>
                                      <CommandGroup heading="Elements">
                                      {blockMenuItems.map((item) => (
                                          <CommandItem key={item.name} onSelect={item.command} className={cn(item.isActive() && "bg-accent text-accent-foreground")}>
                                              <item.icon className="mr-2 h-4 w-4" />
                                              <span>{item.name}</span>
                                          </CommandItem>
                                      ))}
                                      </CommandGroup>
                                  </CommandList>
                              </Command>
                          </PopoverContent>
                      </Popover>
                      <Button variant="ghost" size="icon" className="rounded-full border bg-background shadow-sm text-muted-foreground h-8 w-8 cursor-grab">
                          <GripVertical className="h-5 w-5" />
                      </Button>
                  </FloatingMenu>

                <EditorContent editor={editor} />
              </div>
          </div>

          <DialogFooter className="p-4 border-t flex-shrink-0 flex items-center justify-end w-full">
              <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                      Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Done
                  </Button>
              </div>
          </DialogFooter>
        </div>

        <div className={cn(
          "flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          isSidebarOpen ? "w-[320px]" : "w-0"
        )}>
            <aside className="bg-card border-l flex-shrink-0 h-full w-[320px]">
              <ScrollArea className="h-full p-4">
                  <div className="space-y-6">
                      <div className="space-y-2">
                          <Label>Zone</Label>
                          <Popover open={isZonePopoverOpen} onOpenChange={setIsZonePopoverOpen}>
                              <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" aria-expanded={isZonePopoverOpen}
                                      className={cn("w-full justify-between", !selectedZoneId && "text-muted-foreground")}>
                                      <div className="flex items-center"><ZoneDisplayIcon className="mr-2 h-4 w-4 opacity-80 shrink-0" /><span className="truncate">{zoneDisplayName}</span></div>
                                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                  <Command>
                                      <CommandInput placeholder="Search or create zone..." value={zoneSearchText} onValueChange={setZoneSearchText} />
                                      <CommandList>
                                      <CommandEmpty>{zoneSearchText.trim() === '' ? 'No zones found.' : 'No matching zones found.'}</CommandEmpty>
                                      <CommandGroup>
                                          <CommandItem onSelect={() => { setSelectedZoneId(undefined); setIsZonePopoverOpen(false); }}>
                                              <Check className={cn("mr-2 h-4 w-4", selectedZoneId === undefined ? "opacity-100" : "opacity-0")} /> No Zone
                                          </CommandItem>
                                          {filteredZones.map((z) => {
                                              const ListItemIcon = getIconComponent(z.icon);
                                              return (
                                              <CommandItem key={z.id} value={z.name} onSelect={() => { setSelectedZoneId(z.id); setIsZonePopoverOpen(false); }}>
                                                  <Check className={cn("mr-2 h-4 w-4", selectedZoneId === z.id ? "opacity-100" : "opacity-0")} />
                                                  <ListItemIcon className="mr-2 h-4 w-4 opacity-70" />{z.name}
                                              </CommandItem>);
                                          })}
                                      </CommandGroup>
                                      {showCreateZoneOption && (
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
                      </div>
                       <div className="space-y-2">
                          <Label>Tags</Label>
                          <div className="flex flex-wrap gap-2">
                              {currentTags.map(tag => (
                                  <Badge key={tag.id} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                      {tag.name}
                                      <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 focus:outline-none rounded-full hover:bg-destructive/20 p-0.5"><X className="h-3 w-3" /></button>
                                  </Badge>
                              ))}
                          </div>
                          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagInputKeyDown} placeholder="Add tags..." className="focus-visible:ring-accent" />
                      </div>
                      <div className="space-y-2">
                          <Label className="flex items-center gap-2"><Pencil className="h-4 w-4"/> Memory Note</Label>
                          <Textarea value={memoryNote} onChange={(e) => setMemoryNote(e.target.value)} placeholder="Add your personal thoughts..." className="min-h-[120px]" />
                      </div>
                  </div>
              </ScrollArea>
            </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FocusModeDialog;
