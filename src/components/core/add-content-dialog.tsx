
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import type { Collection, ContentItem, ContentItemType, Tag } from '@/types';
import { suggestTags, type SuggestTagsInput } from '@/ai/flows/suggest-tags';
import { analyzeLinkSentiment, type AnalyzeLinkSentimentInput } from '@/ai/flows/analyze-sentiment';
import { useToast } from '@/hooks/use-toast';

// Schema for the unified form
const contentFormSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  title: z.string().min(1, { message: 'Title is required.' }),
  description: z.string().min(1, { message: 'Content is required.'}), // Now 'Content'
  collectionId: z.string().optional(),
  // imageUrl is no longer handled by this dialog
});

export interface AddContentDialogOpenChange {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface AddContentDialogProps extends AddContentDialogOpenChange {
  collections: Collection[];
  onContentAdd: (newContent: Omit<ContentItem, 'id' | 'createdAt'>) => void;
  children?: React.ReactNode;
}

const PLACEHOLDER_NONE_COLLECTION_VALUE = "__none_collection__";

const AddContentDialog: React.FC<AddContentDialogProps> = ({ open, onOpenChange, collections, onContentAdd, children }) => {
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [isAnalyzingLink, setIsAnalyzingLink] = useState(false);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof contentFormSchema>>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      url: '',
      title: '',
      description: '',
      collectionId: '',
    },
  });

  const watchedUrl = form.watch('url');
  const watchedTitle = form.watch('title');
  const watchedDescription = form.watch('description'); // This is the "Content"
  const watchedCollectionId = form.watch('collectionId');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      form.reset({
        url: '',
        title: '',
        description: '',
        collectionId: '',
      });
      setCurrentTags([]);
      setSuggestedTags([]);
      setTagInput('');
    }
  }, [open, form]);

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

  const canSuggestTags = !!watchedUrl && !!watchedTitle && z.string().url().safeParse(watchedUrl).success;

  const handleSuggestTags = async () => {
    if (!canSuggestTags) {
      toast({ title: "URL and Title needed for link", description: "Please enter a valid URL and Title to suggest tags.", variant: "destructive" });
      return;
    }
    setIsSuggestingTags(true);
    try {
      const aiInput: SuggestTagsInput = { url: watchedUrl as string, title: watchedTitle, content: watchedTitle + (watchedDescription || '') };
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

  async function onSubmit(values: z.infer<typeof contentFormSchema>) {
    const isLink = !!values.url && z.string().url().safeParse(values.url).success;
    const type: ContentItemType = isLink ? 'link' : 'note';

    let sentimentData;
    if (isLink) {
      setIsAnalyzingLink(true);
      try {
          const sentimentInput: AnalyzeLinkSentimentInput = { url: values.url as string, content: values.title + (values.description || '') };
          const sentimentResult = await analyzeLinkSentiment(sentimentInput);
          sentimentData = { label: sentimentResult.sentiment.toLowerCase() as 'positive' | 'negative' | 'neutral', score: sentimentResult.score };
          toast({ title: "Sentiment Analyzed", description: `Link sentiment: ${sentimentData.label}` });
      } catch (error) {
          console.error("Error analyzing sentiment:", error);
          toast({ title: "Sentiment Analysis Failed", description: "Could not analyze link sentiment.", variant: "destructive" });
      }
      setIsAnalyzingLink(false);
    }

    const contentData: Omit<ContentItem, 'id' | 'createdAt'> = {
      type,
      title: values.title,
      description: values.description, // This is the "Content" field
      collectionId: values.collectionId === PLACEHOLDER_NONE_COLLECTION_VALUE ? undefined : values.collectionId,
      tags: currentTags,
      url: isLink ? values.url : undefined,
      sentiment: isLink ? sentimentData : undefined,
      // imageUrl is not handled here anymore
    };

    onContentAdd(contentData);
    if (onOpenChange) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Add Content</DialogTitle>
          <DialogDescription>
            Provide a URL to save a link, or just add a title and content to save a note.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="font-medium">URL (Optional)</Label>
            <Input id="url" {...form.register('url')} placeholder="https://example.com (Leave empty for a note)" className="focus-visible:ring-accent"/>
            {form.formState.errors.url && <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="font-medium">Title</Label>
            <Input id="title" {...form.register('title')} placeholder="Content Title" className="focus-visible:ring-accent"/>
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-medium">
              Content
            </Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Write your content or note here..."
              className="focus-visible:ring-accent"
              rows={5}
            />
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
              {/* Tag suggestions only enabled if URL is present and valid */}
              <Button type="button" variant="outline" size="sm" onClick={handleSuggestTags} disabled={isSuggestingTags || !canSuggestTags}>
                {isSuggestingTags ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
                Suggest Tags
              </Button>
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
             {suggestedTags.length > 0 && canSuggestTags && (
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
          <Button type="button" variant="outline" onClick={() => onOpenChange && onOpenChange(false)}>Cancel</Button>
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
