
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Lightbulb, Loader2, Sparkles, Link as LinkIcon, ImageIcon, ListTodo, Mic, StickyNote } from 'lucide-react';
import type { Collection, LinkItem, Tag } from '@/types';
import { suggestTags, type SuggestTagsInput } from '@/ai/flows/suggest-tags';
import { analyzeLinkSentiment, type AnalyzeLinkSentimentInput } from '@/ai/flows/analyze-sentiment';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  url: z.string().optional(), // Optional now, only required if contentType is 'link'
  title: z.string().min(1, { message: 'Title is required.' }),
  description: z.string().optional(),
  collectionId: z.string().optional(),
});

// Add this validation refinement if URL is provided for link type
const refinedFormSchema = formSchema.refine(data => {
    // This refinement should be conditional on contentType, handled in onSubmit
    return true; 
}, {});


export interface AddContentDialogOpenChange {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ContentType = 'link' | 'note' | 'image' | 'todo' | 'voice';

// Prop for onContentAdd might need to be more generic later
interface AddContentDialogProps extends AddContentDialogOpenChange {
  collections: Collection[];
  onContentAdd: (newContent: Omit<LinkItem, 'id' | 'createdAt' | 'imageUrl'>) => void; 
  children?: React.ReactNode; 
}

const PLACEHOLDER_NONE_COLLECTION_VALUE = "__none_collection__";

const AddContentDialog: React.FC<AddContentDialogProps> = ({ open, onOpenChange, collections, onContentAdd, children }) => {
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('link');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema), // Use base schema first
    defaultValues: {
      url: '',
      title: '',
      description: '',
      collectionId: '',
    },
  });

  const watchedUrl = form.watch('url');
  const watchedTitle = form.watch('title');
  const watchedDescription = form.watch('description');
  const watchedCollectionId = form.watch('collectionId');

  useEffect(() => {
    if (open) {
      form.reset();
      setCurrentTags([]);
      setSuggestedTags([]);
      setTagInput('');
      // setSelectedContentType('link'); // Reset to default content type or keep last selected
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
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
      onContentAdd({ ...values, url: values.url, tags: currentTags, sentiment: sentimentData });
    } else if (selectedContentType === 'note') {
        onContentAdd({ ...values, url: undefined, tags: currentTags }); // No URL for a note
    } else {
      toast({
        title: `${selectedContentType.charAt(0).toUpperCase() + selectedContentType.slice(1)} Content Type`,
        description: `Adding ${selectedContentType}s is not yet implemented.`,
        variant: "default",
      });
      // For now, we can still "save" it with the common fields
      onContentAdd({ ...values, url: undefined, tags: currentTags }); 
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
                    onClick={() => setSelectedContentType(item.type as ContentType)}
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
              rows={selectedContentType === 'note' ? 5 : 3}
            />
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
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isAnalyzing || isSuggesting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {(isAnalyzing && selectedContentType === 'link') && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {(isAnalyzing && selectedContentType === 'link') ? 'Analyzing...' : 'Add Content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddContentDialog;
