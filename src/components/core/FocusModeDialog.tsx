

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
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
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Plus, Check, ChevronDown, Bookmark, Briefcase, Home, Library, ListChecks } from 'lucide-react';
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
import TurndownService from 'turndown';
import { marked } from 'marked';
import { Textarea } from '../ui/textarea';


interface FocusModeDialogProps {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const FocusModeDialog: React.FC<FocusModeDialogProps> = ({ item, open, onOpenChange, zones, onZoneCreate }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>();
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  const [isZonePopoverOpen, setIsZonePopoverOpen] = useState(false);
  const [zoneSearchText, setZoneSearchText] = useState('');

  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'markdown'>('wysiwyg');
  const [rawMarkdown, setRawMarkdown] = useState('');
  const turndownService = new TurndownService();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Write something amazing...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none max-w-full',
      },
    },
    onUpdate: ({ editor }) => {
      setRawMarkdown(turndownService.turndown(editor.getHTML()));
    },
    autofocus: true,
  });

  useEffect(() => {
    if (open && editor) {
      const isNewNote = !item;
      if (isNewNote) {
        editor.commands.clearContent();
        setRawMarkdown('');
        setSelectedZoneId(undefined);
        setCurrentTags([]);
      } else {
        const html = marked.parse(item.description || '') as string;
        editor.commands.setContent(html);
        setRawMarkdown(item.description || '');
        setSelectedZoneId(item.zoneId);
        setCurrentTags(item.tags || []);
      }
      setEditorMode('wysiwyg');
    }
  }, [item, editor, open]);

  const handleRawMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMarkdown = e.target.value;
    setRawMarkdown(newMarkdown);
    if (editor) {
      const html = marked.parse(newMarkdown) as string;
      editor.commands.setContent(html, false); // false to avoid re-triggering onUpdate
    }
  };
  
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
    
    const finalMarkdown = rawMarkdown;
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
                description: finalMarkdown,
                tags: currentTags,
                zoneId: selectedZoneId
            });
            toast({ title: "Note Updated" });
        } else { // This is a new creation
            const generatedTitle = textContent.split(/\s+/).slice(0, 5).join(' ') + (textContent.split(/\s+/).length > 5 ? '...' : '');
            const contentData: Omit<ContentItem, 'id' | 'createdAt'> = {
                type: 'note',
                title: generatedTitle || 'Untitled Note',
                description: finalMarkdown,
                contentType: 'Note',
                status: 'pending-analysis',
                tags: currentTags,
                zoneId: selectedZoneId,
                userId: user.uid,
            };
            await addContentItem(contentData);
            toast({ title: "Note Saved" });
        }
        onOpenChange(false);
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

  const selectedZone = zones.find(z => z.id === selectedZoneId);
  const ZoneDisplayIcon = getIconComponent(selectedZone?.icon);
  const zoneDisplayName = selectedZone?.name || 'Select a zone';
  const filteredZones = zoneSearchText ? zones.filter(z => z.name.toLowerCase().includes(zoneSearchText.toLowerCase())) : zones;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-7xl h-[95vh] flex flex-col p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 border-b flex-shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="font-headline">Focus Mode</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant={editorMode === 'wysiwyg' ? 'default' : 'outline'} size="sm" onClick={() => setEditorMode('wysiwyg')}>Editor</Button>
            <Button variant={editorMode === 'markdown' ? 'default' : 'outline'} size="sm" onClick={() => setEditorMode('markdown')}>Markdown</Button>
          </div>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-8 md:p-12 relative">
            <div className={cn('h-full', editorMode === 'wysiwyg' ? 'block' : 'hidden')}>
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
                      <ToggleGroupItem value="tasks" aria-label="Toggle Task List" onClick={() => editor.chain().focus().toggleTaskList().run()} data-active={editor.isActive('taskList')}>
                          <ListChecks className="h-4 w-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="code" aria-label="Toggle code" onClick={() => editor.chain().focus().toggleCode().run()} data-active={editor.isActive('code')}>
                          <Code className="h-4 w-4" />
                      </ToggleGroupItem>
                  </ToggleGroup>
              </BubbleMenu>
            </div>
            <Textarea
                value={rawMarkdown}
                onChange={handleRawMarkdownChange}
                className={cn(
                  "w-full h-full font-mono text-sm bg-muted/30 resize-none border-0 focus-visible:ring-0 absolute inset-0 p-8 md:p-12",
                  editorMode === 'markdown' ? 'block' : 'hidden'
                )}
                placeholder="Start typing markdown..."
            />
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
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Done
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FocusModeDialog;
