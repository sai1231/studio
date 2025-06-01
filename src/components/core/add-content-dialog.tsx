
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
import type { Collection, ContentItemType, Tag, ContentItemFirestoreData, ContentItem } from '@/types';
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
  description: z.string().min(1, { message: 'Content is required.' }),
  collectionId: z.string().min(1, { message: 'Collection is required.' }), // Made collectionId required
});

export interface AddContentDialogOpenChange {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface AddContentDialogProps extends AddContentDialogOpenChange {
  collections: Collection[];
  onContentAdd: (newContent: Omit<ContentItemFirestoreData, 'createdAt' | 'tags'> & { tags: ContentItem['tags']}) => void;
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

const AddContentDialog: React.FC<AddContentDialogProps> = ({ open, onOpenChange, collections, onContentAdd, children }) => {
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
      collectionId: collections[0]?.id || '', // Default to first collection or empty if none
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
        placeholder: 'Write your content or note here...',
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
        collectionId: collections[0]?.id || '',
      });
      setCurrentTags([]);
      setTagInput('');
      editor?.commands.setContent(initialDescription);
    }
  }, [open, form, editor, collections]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);
  
  const watchedCollectionId = form.watch('collectionId');

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
    const finalIsLink = !!values.url && z.string().url().safeParse(values.url).success;
    const type: ContentItemType = finalIsLink ? 'link' : 'note';
    
    const descriptionFromEditor = editor?.getHTML();
    const finalDescription = (descriptionFromEditor === '<p></p>' && editor?.isEmpty) ? '' : descriptionFromEditor;

    const contentData: Omit<ContentItemFirestoreData, 'createdAt' | 'tags'> & { tags: ContentItem['tags']} = {
      type,
      title: values.title,
      description: finalDescription || undefined,
      collectionId: values.collectionId, // collectionId is now mandatory
      tags: currentTags,
      url: finalIsLink ? values.url : undefined,
      // userId: "TODO_CURRENT_USER_ID", 
    };
    
    try {
      await onContentAdd(contentData); // This is now an async call to AppLayout
    } catch (error) {
      // Error toast is handled in AppLayout
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Add Content</DialogTitle>
          <DialogDescription>
            Provide a URL to save a link, or just add a title and content to save a note. Select a collection.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="font-medium">URL (Optional for Notes)</Label>
            <Input id="url" {...form.register('url')} placeholder="https://example.com" className="focus-visible:ring-accent"/>
            {form.formState.errors.url && <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="font-medium">Title</Label>
            <Input id="title" {...form.register('title')} placeholder="Content Title" className="focus-visible:ring-accent"/>
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-medium">Content</Label>
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
            <Label htmlFor="collectionId" className="font-medium">Collection</Label>
            <Select
              onValueChange={(selectedValue) => {
                form.setValue('collectionId', selectedValue, { shouldTouch: true, shouldValidate: true });
              }}
              value={watchedCollectionId}
              defaultValue={collections[0]?.id}
            >
              <SelectTrigger className="w-full focus:ring-accent">
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map(collection => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.collectionId && <p className="text-sm text-destructive">{form.formState.errors.collectionId.message}</p>}
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
            {isSaving ? 'Saving...' : 'Save Content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialog;
