
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Loader2 } from 'lucide-react';
import type { Zone, LinkItem, Tag } from '@/types'; // Renamed Collection to Zone
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  url: z.string().url({ message: 'Please enter a valid URL.' }),
  title: z.string().min(1, { message: 'Title is required.' }),
  description: z.string().optional(),
  zoneId: z.string().optional(), // Renamed collectionId to zoneId
});

export interface AddLinkDialogOpenChange {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface AddLinkDialogProps extends AddLinkDialogOpenChange {
  zones: Zone[]; // Renamed collections to zones
  onLinkAdd: (newLink: Omit<LinkItem, 'id' | 'createdAt' | 'imageUrl'>) => void;
  children?: React.ReactNode;
}

const PLACEHOLDER_NONE_ZONE_VALUE = "__none_zone__"; // Renamed from PLACEHOLDER_NONE_COLLECTION_VALUE

const AddLinkDialog: React.FC<AddLinkDialogProps> = ({ open, onOpenChange, zones, onLinkAdd, children }) => { // Renamed collections to zones
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: '',
      title: '',
      description: '',
      zoneId: '', // Renamed collectionId to zoneId
    },
  });

  const watchedZoneId = form.watch('zoneId'); // Renamed watchedCollectionId to watchedZoneId

  useEffect(() => {
    if (open) {
      form.reset();
      setCurrentTags([]);
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
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    
    // The LinkItem type (which extends ContentItem) now has zoneId from the types/index.ts change.
    // So, `...values` will correctly include `zoneId` if it's set.
    onLinkAdd({ ...values, tags: currentTags });
    setIsSaving(false); 
    if (onOpenChange) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Add New Link</DialogTitle>
          <DialogDescription>
            Save a new link to your Klipped zone. Fill in the details below. {/* Renamed collection to zone */}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-2 space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="font-medium">URL</Label>
            <Input id="url" {...form.register('url')} placeholder="https://example.com" className="focus-visible:ring-accent"/>
            {form.formState.errors.url && <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="font-medium">Title</Label>
            <Input id="title" {...form.register('title')} placeholder="My Awesome Link" className="focus-visible:ring-accent"/>
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-medium">Description (Optional)</Label>
            <Textarea id="description" {...form.register('description')} placeholder="A brief description of the link..." className="focus-visible:ring-accent"/>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zoneId" className="font-medium">Zone (Optional)</Label> {/* Renamed collectionId to zoneId */}
            <Select
              onValueChange={(selectedValue) => {
                if (selectedValue === PLACEHOLDER_NONE_ZONE_VALUE) { // Renamed from PLACEHOLDER_NONE_COLLECTION_VALUE
                  form.setValue('zoneId', '', { shouldTouch: true }); // Renamed collectionId to zoneId
                } else {
                  form.setValue('zoneId', selectedValue, { shouldTouch: true }); // Renamed collectionId to zoneId
                }
              }}
              value={watchedZoneId || ''} // Renamed watchedCollectionId to watchedZoneId
            >
              <SelectTrigger className="w-full focus:ring-accent">
                <SelectValue placeholder="Select a zone" /> {/* Renamed collection to zone */}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLACEHOLDER_NONE_ZONE_VALUE}> {/* Renamed from PLACEHOLDER_NONE_COLLECTION_VALUE */}
                  None
                </SelectItem>
                {zones.map(zone => ( // Renamed collections to zones, collection to zone
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="tags" className="font-medium">Tags</Label>
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
          <Button type="button" variant="outline" onClick={() => onOpenChange && onOpenChange(false)}>Cancel</Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Add Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddLinkDialog;
