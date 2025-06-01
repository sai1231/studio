
'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Image from 'next/image';
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
import { X, Lightbulb, Loader2, Sparkles, Link as LinkIcon, ImageIcon, ListTodo, Mic, StickyNote, UploadCloud } from 'lucide-react';
import type { Collection, ContentItem, ContentItemType, Tag } from '@/types';
import { suggestTags, type SuggestTagsInput } from '@/ai/flows/suggest-tags';
import { analyzeLinkSentiment, type AnalyzeLinkSentimentInput } from '@/ai/flows/analyze-sentiment';
import { useToast } from '@/hooks/use-toast';

// Base schema for common fields
const baseFormSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }),
  description: z.string().optional(),
  collectionId: z.string().optional(),
  imageUrl: z.string().optional(), // For link previews or uploaded image Data URLs
});

// Schema for 'link' type, requiring URL
const linkFormSchema = baseFormSchema.extend({
  url: z.string().url({ message: 'Please enter a valid URL.' }),
});

// Schema for 'note' type
const noteFormSchema = baseFormSchema.extend({
  url: z.string().optional(), // URL is not applicable
});

// Schema for 'image' type
const imageFormSchema = baseFormSchema.extend({
  url: z.string().optional(), // URL is not applicable for direct image upload
  imageUrl: z.string().min(1, {message: 'Image is required.'}).optional(), // Will store Data URL
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

const getValidationSchema = (type: ContentItemType) => {
  switch (type) {
    case 'link':
      return linkFormSchema;
    case 'image':
      return imageFormSchema;
    case 'note':
      return noteFormSchema;
    default: // For 'todo', 'voice' which are not fully implemented yet
      return baseFormSchema;
  }
};

const AddContentDialog: React.FC<AddContentDialogProps> = ({ open, onOpenChange, collections, onContentAdd, children }) => {
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<ContentItemType>('link');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof baseFormSchema> & { url?: string }>({
    resolver: zodResolver(getValidationSchema(selectedContentType)),
    defaultValues: {
      url: '',
      title: '',
      description: '',
      collectionId: '',
      imageUrl: '',
    },
  });

  // Update resolver when content type changes
  useEffect(() => {
    form.reset(); // Reset form values
    setImagePreview(null); // Clear image preview
    const newSchema = getValidationSchema(selectedContentType);
    // Manually update the resolver: This is a bit of a hack for react-hook-form.
    // A more robust solution might involve re-initializing the form or using a different strategy for dynamic schemas.
    (form as any). τότε = zodResolver(newSchema); // "τότε" is a placeholder for internal field, actual update might differ
    form.trigger(); // Re-validate with the new schema
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContentType]);


  const watchedUrl = form.watch('url');
  const watchedTitle = form.watch('title');
  const watchedDescription = form.watch('description');
  const watchedCollectionId = form.watch('collectionId');
  const watchedImageUrl = form.watch('imageUrl');

  useEffect(() => {
    if (open) {
      form.reset({
        url: '',
        title: '',
        description: '',
        collectionId: '',
        imageUrl: '',
      });
      setCurrentTags([]);
      setSuggestedTags([]);
      setTagInput('');
      setImagePreview(null);
      // setSelectedContentType('link'); // Or keep the last selected one
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
    setSuggestedTags(suggestedTags.filter(st => st.toLowerCase() !== tagName.toLowerCase()));
  };

  const handleSuggestTags = async () => {
    if (selectedContentType !== 'link' || !watchedUrl || !watchedTitle) {
      toast({ title: "URL and Title needed for link", description: "Please enter a URL and Title to suggest tags for a link.", variant: "destructive" });
      return;
    }
     if (!z.string().url().safeParse(watchedUrl).success) {
      form.setError('url', { type: 'manual', message: 'Please enter a valid URL to suggest tags.' });
      return;
    }
    setIsSuggesting(true);
    try {
      const aiInput: SuggestTagsInput = { url: watchedUrl, title: watchedTitle, content: watchedTitle + (watchedDescription || '') };
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
    setIsSuggesting(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue('imageUrl', dataUrl, { shouldValidate: true });
        setImagePreview(dataUrl);
        if (!form.getValues('title')) {
          form.setValue('title', file.name.replace(/\.[^/.]+$/, "")); // Set title from filename without extension
        }
        setIsUploading(false);
        toast({ title: "Image Selected", description: file.name });
      };
      reader.onerror = () => {
        setIsUploading(false);
        toast({ title: "Error Reading File", variant: "destructive" });
      }
      reader.readAsDataURL(file);
    }
  };


  async function onSubmit(values: z.infer<typeof baseFormSchema> & { url?: string }) {
    const commonData: Omit<ContentItem, 'id' | 'createdAt' | 'type' | 'sentiment'> & { type?: ContentItemType; sentiment?: ContentItem['sentiment'] } = {
      title: values.title,
      description: values.description,
      collectionId: values.collectionId === PLACEHOLDER_NONE_COLLECTION_VALUE ? undefined : values.collectionId,
      tags: currentTags,
      imageUrl: values.imageUrl || undefined,
    };

    if (selectedContentType === 'link') {
      if (!values.url || !z.string().url().safeParse(values.url).success) {
        form.setError('url', { type: 'manual', message: 'Please enter a valid URL for a link.' });
        return;
      }
      setIsAnalyzing(true);
      let sentimentData;
      try {
          const sentimentInput: AnalyzeLinkSentimentInput = { url: values.url, content: values.title + (values.description || '') };
          const sentimentResult = await analyzeLinkSentiment(sentimentInput);
          sentimentData = { label: sentimentResult.sentiment.toLowerCase() as 'positive' | 'negative' | 'neutral', score: sentimentResult.score };
          toast({ title: "Sentiment Analyzed", description: `Link sentiment: ${sentimentData.label}` });
      } catch (error) {
          console.error("Error analyzing sentiment:", error);
          toast({ title: "Sentiment Analysis Failed", description: "Could not analyze link sentiment.", variant: "destructive" });
      }
      setIsAnalyzing(false);
      onContentAdd({ ...commonData, type: 'link', url: values.url, sentiment: sentimentData, imageUrl: values.imageUrl || undefined });
    } else if (selectedContentType === 'note') {
        onContentAdd({ ...commonData, type: 'note', url: undefined, imageUrl: undefined }); // Notes shouldn't have imageUrl unless specifically designed for it
    } else if (selectedContentType === 'image') {
        if (!values.imageUrl) {
            form.setError('imageUrl', {type: 'manual', message: 'Please upload an image.'});
            return;
        }
        onContentAdd({ ...commonData, type: 'image', url: undefined, imageUrl: values.imageUrl});
    }
    else {
      // For 'todo', 'voice'
      toast({
        title: `${selectedContentType.charAt(0).toUpperCase() + selectedContentType.slice(1)} Content Type`,
        description: `Adding ${selectedContentType}s is not yet implemented.`,
        variant: "default",
      });
      // Still "save" with common fields and type
      onContentAdd({ ...commonData, type: selectedContentType, url: undefined, imageUrl: undefined });
    }
    if (onOpenChange) onOpenChange(false);
  }

  const contentTypeIconProps = "h-5 w-5";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <div onClick={(e) => e.stopPropagation()}>{children}</div>}
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Add Content</DialogTitle>
          <DialogDescription>
            Select content type and fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-3 border-b">
            {[
                {type: 'link', icon: <LinkIcon className={contentTypeIconProps}/>, label: 'Link'},
                {type: 'note', icon: <StickyNote className={contentTypeIconProps}/>, label: 'Note'},
                {type: 'image', icon: <ImageIcon className={contentTypeIconProps}/>, label: 'Image'},
                {type: 'todo', icon: <ListTodo className={contentTypeIconProps}/>, label: 'To-Do'},
                {type: 'voice', icon: <Mic className={contentTypeIconProps}/>, label: 'Voice'},
            ].map(item => (
                <Button
                    key={item.type}
                    variant={selectedContentType === item.type ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedContentType(item.type as ContentItemType);
                      form.clearErrors(); // Clear all errors on type switch
                    }}
                    className="flex-1 sm:flex-none"
                >
                    {item.icon}
                    <span className="ml-2 hidden sm:inline">{item.label}</span>
                </Button>
            ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
          {selectedContentType === 'link' && (
            <div className="space-y-2">
              <Label htmlFor="url" className="font-medium">URL</Label>
              <Input id="url" {...form.register('url')} placeholder="https://example.com" className="focus-visible:ring-accent"/>
              {form.formState.errors.url && <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>}
            </div>
          )}

          {selectedContentType === 'image' && (
            <div className="space-y-2">
              <Label htmlFor="imageFile" className="font-medium">Image File</Label>
              <div className="flex items-center gap-2">
                <Input 
                    id="imageFile" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 focus-visible:ring-accent"
                    disabled={isUploading}
                />
                {isUploading && <Loader2 className="h-5 w-5 animate-spin text-primary"/>}
              </div>
              {form.formState.errors.imageUrl && <p className="text-sm text-destructive">{form.formState.errors.imageUrl.message}</p>}
              {imagePreview && (
                <div className="mt-2 rounded-md border border-dashed border-border p-2 flex justify-center items-center max-h-48 overflow-hidden">
                  <Image src={imagePreview} alt="Selected image preview" width={200} height={200} className="max-w-full max-h-44 object-contain rounded"/>
                </div>
              )}
              {!imagePreview && !isUploading && (
                <div className="mt-2 rounded-md border border-dashed border-border p-6 flex flex-col items-center justify-center text-muted-foreground">
                    <UploadCloud className="h-10 w-10 mb-2"/>
                    <p>Click or drag to upload an image</p>
                </div>
              )}
            </div>
          )}


          <div className="space-y-2">
            <Label htmlFor="title" className="font-medium">Title</Label>
            <Input id="title" {...form.register('title')} placeholder={selectedContentType === 'link' ? "My Awesome Link" : "Content Title"} className="focus-visible:ring-accent"/>
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-medium">
              {selectedContentType === 'note' ? 'Note Content' : 'Description (Optional)'}
            </Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder={selectedContentType === 'note' ? "Write your note here..." : "A brief description..."}
              className="focus-visible:ring-accent"
              rows={selectedContentType === 'note' ? 5 : (selectedContentType === 'image' ? 2 : 3)}
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
              <Label htmlFor="tags" className="font-medium">Tags</Label>
              {selectedContentType === 'link' && (
                <Button type="button" variant="outline" size="sm" onClick={handleSuggestTags} disabled={isSuggesting || !watchedUrl || !watchedTitle}>
                  {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
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
             {suggestedTags.length > 0 && selectedContentType === 'link' && (
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
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isAnalyzing || isSuggesting || isUploading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {(isAnalyzing && selectedContentType === 'link') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {(isAnalyzing && selectedContentType === 'link') ? 'Analyzing...' : (isUploading ? 'Uploading...' : 'Add Content')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialog;

    