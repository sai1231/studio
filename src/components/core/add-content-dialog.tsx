
'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
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
import { X, Lightbulb, Loader2, Sparkles, Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Palette, Quote, Minus } from 'lucide-react';
import type { Collection, ContentItemType, Tag, ContentItemFirestoreData, ContentItem } from '@/types'; // Updated types
import { suggestTags, type SuggestTagsInput } from '@/ai/flows/suggest-tags';
import { analyzeLinkSentiment, type AnalyzeLinkSentimentInput } from '@/ai/flows/analyze-sentiment';
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
  description: z.string().min(1, { message: 'Content is required.' }), // Content is now always required
  collectionId: z.string().optional(),
});

// No longer need refinedContentFormSchema as image uploads are separate
// and description is always required.

export interface AddContentDialogOpenChange {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface AddContentDialogProps extends AddContentDialogOpenChange {
  collections: Collection[];
  // onContentAdd now expects data that can be directly used for ContentItemFirestoreData
  onContentAdd: (newContent: Omit<ContentItemFirestoreData, 'createdAt' | 'tags'> & { tags: ContentItem['tags']}) => void;
  children?: React.ReactNode;
}

const PLACEHOLDER_NONE_COLLECTION_VALUE = "__none_collection__";

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
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [isAnalyzingLink, setIsAnalyzingLink] = useState(false);
  
  const { toast } = useToast();

  const form = useForm<z.infer<typeof contentFormSchemaBase>>({
    resolver: zodResolver(contentFormSchemaBase),
    defaultValues: {
      url: '',
      title: '',
      description: '',
      collectionId: '',
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
        collectionId: '',
      });
      setCurrentTags([]);
      setSuggestedTags([]);
      setTagInput('');
      editor?.commands.setContent(initialDescription);
    }
  }, [open, form, editor]);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const watchedUrl = form.watch('url');
  const watchedTitle = form.watch('title');
  const watchedCollectionId = form.watch('collectionId');
  
  const isLinkContent = !!watchedUrl && z.string().url().safeParse(watchedUrl).success;

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

  const addSuggestedTag = (tagName: string) => {
    if (!currentTags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase())) {
      setCurrentTags([...currentTags, { id: Date.now().toString(), name: tagName }]);
    }
    setSuggestedTags(prev => prev.filter(st => st.toLowerCase() !== tagName.toLowerCase()));
  };

  const handleSuggestTags = async () => {
    if (!isLinkContent || !watchedTitle) {
      toast({ title: "URL and Title needed", description: "Please enter a valid URL and Title to suggest tags.", variant: "destructive" });
      return;
    }
    setIsSuggestingTags(true);
    try {
      const contentForAISuggestion = editor?.getText() || form.getValues('description') || '';
      const aiInput: SuggestTagsInput = { url: watchedUrl as string, title: watchedTitle, content: contentForAISuggestion };
      const result = await suggestTags(aiInput);
      setSuggestedTags(result.tags.filter(st => !currentTags.some(ct => ct.name.toLowerCase() === st.toLowerCase())));
      if (result.tags.length > 0) {
        toast({ title: "Tags Suggested!", description: "AI has suggested some tags for your link." });
      } else {
        toast({ title: "No new tags suggested.", description: "AI couldn't find new relevant tags." });
      }
    } catch (error) {
      console.error("Error suggesting tags:", error);
      toast({ title: "Error", description: "Could not suggest tags at this time.", variant: "destructive" });
    }
    setIsSuggestingTags(false);
  };

  async function onSubmit(values: z.infer<typeof contentFormSchemaBase>) {
    const finalIsLink = !!values.url && z.string().url().safeParse(values.url).success;
    const type: ContentItemType = finalIsLink ? 'link' : 'note';

    let sentimentData;
    if (finalIsLink) {
      setIsAnalyzingLink(true);
      try {
          const contentForAISentiment = editor?.getText() || values.description || ''; // description is HTML from editor
          const sentimentInput: AnalyzeLinkSentimentInput = { url: values.url as string, content: values.title + " " + contentForAISentiment };
          const sentimentResult = await analyzeLinkSentiment(sentimentInput);
          sentimentData = { label: sentimentResult.sentiment.toLowerCase() as 'positive' | 'negative' | 'neutral', score: sentimentResult.score };
          toast({ title: "Sentiment Analyzed", description: `Link sentiment: ${sentimentData.label}` });
      } catch (error) {
          console.error("Error analyzing sentiment:", error);
          toast({ title: "Sentiment Analysis Failed", description: "Could not analyze link sentiment.", variant: "destructive" });
      }
      setIsAnalyzingLink(false);
    }
    
    const descriptionFromEditor = editor?.getHTML();
    const finalDescription = (descriptionFromEditor === '<p></p>' && editor?.isEmpty) ? '' : descriptionFromEditor;

    // Prepare data for Firestore
    const contentData: Omit<ContentItemFirestoreData, 'createdAt' | 'tags'> & { tags: ContentItem['tags']} = {
      type,
      title: values.title,
      description: finalDescription || undefined,
      collectionId: values.collectionId === PLACEHOLDER_NONE_COLLECTION_VALUE ? undefined : values.collectionId,
      tags: currentTags, // currentTags is already Tag[]
      url: finalIsLink ? values.url : undefined,
      sentiment: finalIsLink ? sentimentData : undefined,
      // imageUrl, audioUrl, etc., are not handled by this dialog directly anymore
      // userId: "TODO_CURRENT_USER_ID", // Add when auth is ready
    };
    
    onContentAdd(contentData);
    // Dialog closing is handled by the parent (AppLayout) after successful save.
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Add Content</DialogTitle>
          <DialogDescription>
            Provide a URL to save a link, or just add a title and content to save a note.
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
            <Label htmlFor="collectionId" className="font-medium">Collection (Optional)</Label>
            <Select
              onValueChange={(selectedValue) => {
                form.setValue('collectionId', selectedValue === PLACEHOLDER_NONE_COLLECTION_VALUE ? '' : selectedValue, { shouldTouch: true });
              }}
              value={watchedCollectionId || PLACEHOLDER_NONE_COLLECTION_VALUE}
            >
              <SelectTrigger className="w-full focus:ring-accent">
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLACEHOLDER_NONE_COLLECTION_VALUE}>
                  None
                </SelectItem>
                {collections.map(collection => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="tags" className="font-medium">Tags (Optional)</Label>
              {isLinkContent && (
                <Button type="button" variant="outline" size="sm" onClick={handleSuggestTags} disabled={isSuggestingTags || !watchedTitle}>
                  {isSuggestingTags ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
                  Suggest Tags
                </Button>
              )}
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
             {suggestedTags.length > 0 && isLinkContent && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground flex items-center"><Lightbulb className="h-3 w-3 mr-1 text-yellow-400"/>Suggested tags:</p>
                <div className="flex flex-wrap gap-1">
                  {suggestedTags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      onClick={() => addSuggestedTag(tag)}
                      className="cursor-pointer hover:bg-accent/20"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => { if (onOpenChange) onOpenChange(false); }}>Cancel</Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isAnalyzingLink || isSuggestingTags} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {(isAnalyzingLink || isSuggestingTags) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {(isAnalyzingLink) ? 'Analyzing...' : (isSuggestingTags ? 'Suggesting...' : 'Save Content')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialog;
