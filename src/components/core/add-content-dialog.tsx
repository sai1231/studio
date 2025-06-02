
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Palette, Quote, Minus } from 'lucide-react';
import type { Zone, ContentItemType, Tag, ContentItem } from '@/types'; 
import { useToast } from '@/hooks/use-toast';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapUnderline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';

const contentFormSchemaBase = z.object({
  url: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  title: z.string().min(1, { message: 'Title is required.' }),
  description: z.string().optional(), // Validation for description will be handled in onSubmit based on type
  zoneId: z.string().min(1, { message: 'Zone is required.' }), 
  contentType: z.string().optional(),
  domain: z.string().optional(),
});

export interface AddContentDialogOpenChange {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface AddContentDialogProps extends AddContentDialogOpenChange {
  zones: Zone[]; 
  onContentAdd: (newContent: Omit<ContentItem, 'id' | 'createdAt'>) => void;
  initialMode?: ContentItemType | 'link/note';
  children?: React.ReactNode;
}

const EditorToolbar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const presetColors = ['#000000', '#e03131', '#2f9e44', '#1971c2', '#f08c00']; 

  return (
    <div className="flex flex-wrap gap-1 border border-input border-b-0 rounded-t-md p-1 bg-muted">
      <Button type="button" variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} title="Bold"> <Bold className="h-4 w-4" /> </Button>
      <Button type="button" variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} title="Italic"> <Italic className="h-4 w-4" /> </Button>
      <Button type="button" variant={editor.isActive('underline') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!editor.can().chain().focus().toggleUnderline().run()} title="Underline"> <Underline className="h-4 w-4" /> </Button>
      <Button type="button" variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} title="Strikethrough"> <Strikethrough className="h-4 w-4" /> </Button>
      <Button type="button" variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1"> <Heading1 className="h-4 w-4" /> </Button>
      <Button type="button" variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2"> <Heading2 className="h-4 w-4" /> </Button>
      <Button type="button" variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3"> <Heading3 className="h-4 w-4" /> </Button>
      <Button type="button" variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List"> <List className="h-4 w-4" /> </Button>
      <Button type="button" variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List"> <ListOrdered className="h-4 w-4" /> </Button>
      <Button type="button" variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote"> <Quote className="h-4 w-4" /> </Button>
      <Button type="button" variant={'ghost'} size="icon" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule"> <Minus className="h-4 w-4" /> </Button>
      <div className="flex items-center gap-1 ml-2" title="Text Color">
        <Palette className="h-4 w-4 text-muted-foreground" />
        {presetColors.map(color => (
          <Button
            key={color}
            type="button"
            onClick={() => editor.chain().focus().setColor(color).run()}
            className={`h-5 w-5 p-0 rounded-sm ${editor.isActive('textStyle', { color }) ? 'ring-2 ring-offset-1 ring-ring' : ''}`}
            style={{ backgroundColor: color }}
            aria-label={`Set color to ${color}`}
          />
        ))}
        <Button type="button" variant={'ghost'} size="sm" onClick={() => editor.chain().focus().unsetColor().run()} className="text-xs">Reset</Button>
      </div>
    </div>
  );
};

const AddContentDialog: React.FC<AddContentDialogProps> = ({ open, onOpenChange, zones, onContentAdd, initialMode = 'link/note', children }) => { 
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<z.infer<typeof contentFormSchemaBase>>({
    resolver: zodResolver(contentFormSchemaBase),
    defaultValues: {
      url: '',
      title: '',
      description: '',
      zoneId: zones[0]?.id || '', 
      contentType: '',
      domain: '',
    },
  });
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      TiptapUnderline,
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: initialMode === 'todo' ? 'Describe your task...' : 'Write your content or note here...',
      }),
    ],
    content: form.getValues('description') || '',
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      if (html === '<p></p>' && currentEditor.isEmpty) {
        form.setValue('description', '', { shouldValidate: true, shouldDirty: true });
      } else {
        form.setValue('description', html, { shouldValidate: true, shouldDirty: true });
      }
    },
  });

  useEffect(() => {
    if (open) {
      const initialDescription = '';
      form.reset({
        url: '',
        title: '',
        description: initialDescription,
        zoneId: zones[0]?.id || '', 
        contentType: initialMode === 'todo' ? 'Task' : '',
        domain: '',
      });
      setCurrentTags([]);
      setTagInput('');
      editor?.commands.setContent(initialDescription);
      editor?.extensionManager.extensions.filter(ext => ext.name === 'placeholder').forEach(ext => {
        ext.options.placeholder = initialMode === 'todo' ? 'Describe your task...' : 'Write your content or note here...';
      });
      // Re-render editor with new placeholder if needed
      if(editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr);

    }
  }, [open, form, editor, zones, initialMode]); 

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);
  
  const watchedZoneId = form.watch('zoneId'); 
  const watchedUrl = form.watch('url');

  useEffect(() => {
    if (initialMode === 'todo') {
        form.setValue('domain', '', {shouldValidate: false, shouldDirty: false}); // Ensure domain is clear for TODO
        return; // Skip domain extraction for TODO mode
    }
    const isLink = !!watchedUrl && z.string().url().safeParse(watchedUrl).success;
    if (isLink) {
      try {
        const urlObject = new URL(watchedUrl);
        const extractedDomain = urlObject.hostname.replace(/^www\./, '');
        form.setValue('domain', extractedDomain, {shouldValidate: true, shouldDirty: true});
      } catch (e) {
        // form.setValue('domain', '', {shouldValidate: true, shouldDirty: true});
      }
    }
  }, [watchedUrl, form, initialMode]);


  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !currentTags.find(tag => tag.name.toLowerCase() === tagInput.trim().toLowerCase())) {
      setCurrentTags([...currentTags, { id: Date.now().toString(), name: tagInput.trim() }]);
    }
    setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const removeTag = (tagToRemove: Tag) => {
    setCurrentTags(currentTags.filter(tag => tag.id !== tagToRemove.id));
  };

  async function onSubmit(values: z.infer<typeof contentFormSchemaBase>) {
    setIsSaving(true);
    
    const type: ContentItemType = initialMode === 'todo'
      ? 'todo'
      : (!!values.url && z.string().url().safeParse(values.url).success ? 'link' : 'note');
    
    const descriptionFromEditor = editor?.getHTML();
    let finalDescription = (descriptionFromEditor === '<p></p>' && editor?.isEmpty) ? '' : descriptionFromEditor;

    if ((type === 'note' || type === 'todo') && !finalDescription) {
        form.setError('description', { type: 'manual', message: `Content is required for ${type === 'note' ? 'notes' : 'TODOs'}.` });
        setIsSaving(false);
        return;
    }
    if (type === 'link' && !finalDescription) { 
        finalDescription = undefined;
    }

    const contentData: Omit<ContentItem, 'id' | 'createdAt'> = {
      type,
      title: values.title,
      description: finalDescription,
      zoneId: values.zoneId, 
      tags: currentTags,
      url: type === 'link' ? values.url : undefined,
      domain: type === 'link' && values.url ? new URL(values.url).hostname.replace(/^www\./, '') : undefined,
      contentType: type === 'todo' ? 'Task' : values.contentType,
    };
    
    try {
      await onContentAdd(contentData); 
    } catch (error) {
      // Error handled by caller
    } finally {
      setIsSaving(false);
    }
  }

  const dialogTitle = initialMode === 'todo' ? "Add New TODO" : "Add Content";
  const dialogDescriptionText = initialMode === 'todo' 
    ? "Write down your task. Select a zone." 
    : "Provide a URL to save a link, or just add a title and content to save a note. Select a zone.";


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescriptionText}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
          {initialMode !== 'todo' && (
            <div className="space-y-2">
              <Label htmlFor="url" className="font-medium">URL (Optional for Notes)</Label>
              <Input id="url" {...form.register('url')} placeholder="https://example.com" className="focus-visible:ring-accent"/>
              {form.formState.errors.url && <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="font-medium">Title</Label>
            <Input id="title" {...form.register('title')} placeholder={initialMode === 'todo' ? "Task Title" : "Content Title"} className="focus-visible:ring-accent"/>
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
          </div>
          
          {initialMode !== 'todo' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domain" className="font-medium">Domain (auto-filled for links)</Label>
                <Input id="domain" {...form.register('domain')} placeholder="example.com" className="focus-visible:ring-accent"/>
                {form.formState.errors.domain && <p className="text-sm text-destructive">{form.formState.errors.domain.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contentType" className="font-medium">Content Type (e.g., Article, Video)</Label>
                <Input id="contentType" {...form.register('contentType')} placeholder="Article, Video, Post" className="focus-visible:ring-accent"/>
                {form.formState.errors.contentType && <p className="text-sm text-destructive">{form.formState.errors.contentType.message}</p>}
              </div>
            </div>
          )}


          <div className="space-y-2">
            <Label htmlFor="description" className="font-medium">
              {initialMode === 'todo' ? 'Task Details' : `Content ${!!watchedUrl && initialMode !== 'todo' ? "(Optional for links)" : "(Required for notes/TODOs)"}`}
            </Label>
            {editor && <EditorToolbar editor={editor} />}
            <div 
              className={`rounded-md border bg-transparent focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${editor ? ( form.formState.errors.description ? 'border-destructive focus-within:ring-destructive' : 'border-input' ) : ''} ${editor ? 'rounded-b-md rounded-t-none' : ''} `}
              onClick={() => editor?.chain().focus().run()}
            >
              <EditorContent editor={editor} />
            </div>
             {form.formState.errors.description && <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zoneId" className="font-medium">Zone</Label> 
            <Select
              onValueChange={(selectedValue) => {
                form.setValue('zoneId', selectedValue, { shouldTouch: true, shouldValidate: true }); 
              }}
              value={watchedZoneId} 
              defaultValue={zones[0]?.id} 
            >
              <SelectTrigger className="w-full focus:ring-accent">
                <SelectValue placeholder="Select a zone" /> 
              </SelectTrigger>
              <SelectContent>
                {zones.map(zone => ( 
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
                 {zones.length === 0 && <SelectItem value="no-zones" disabled>No zones available</SelectItem>} 
              </SelectContent>
            </Select>
            {form.formState.errors.zoneId && <p className="text-sm text-destructive">{form.formState.errors.zoneId.message}</p>} 
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="tags" className="font-medium">Tags (Optional)</Label>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {currentTags.map(tag => (
                <Badge key={tag.id} variant="default" className="bg-primary text-primary-foreground">
                  {tag.name}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 focus:outline-none">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              id="tags"
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyDown={handleTagInputKeyDown}
              placeholder="Add tags (press Enter or ,)"
              className="focus-visible:ring-accent"
            />
          </div>
        </form>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => { if (onOpenChange) onOpenChange(false); }}>Cancel</Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : (initialMode === 'todo' ? 'Add TODO' : 'Save Content')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialog;
