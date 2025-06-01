
'use client';
import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import ContentCard from '@/components/core/link-card';
import type { ContentItem, Collection, ContentItemFirestoreData, Tag as AppTag } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListFilter, LayoutGrid, LayoutList, Loader2, FolderOpen } from 'lucide-react';
import AddContentDialog from '@/components/core/add-content-dialog';
import { useToast } from '@/hooks/use-toast';
import { getContentItems, addContentItem, deleteContentItemFromFirestore } from '@/services/contentService'; // Import Firebase services

const mockCollections: Collection[] = [
  { id: '1', name: 'Work Projects' },
  { id: '2', name: 'Reading List' },
  { id: '3', name: 'Recipes' },
];

export default function DashboardPage() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getContentItems(); // TODO: Pass userId when auth is ready
      setContentItems(items);
    } catch (err) {
      console.error("Error fetching content items:", err);
      setError("Failed to load content. Please try again later.");
      toast({ title: "Error", description: "Could not fetch content.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddOrUpdateContentDialog = async (
    contentData: Omit<ContentItemFirestoreData, 'createdAt' | 'tags'> & { tags: AppTag[] }
  ) => {
    const { id: toastId } = toast({
      title: "Saving Content...",
      description: "Please wait while your content is being saved.",
    });
    try {
      const firestoreReadyTags: ContentItemFirestoreData['tags'] = contentData.tags;
      // TODO: if editingContent, this should be an update operation
      await addContentItem({
        ...contentData,
        tags: firestoreReadyTags,
        // userId: "TODO_CURRENT_USER_ID", 
      });
      toast({
        id: toastId,
        title: "Content Saved!",
        description: `"${contentData.title}" has been successfully saved.`,
      });
      setIsAddContentDialogOpen(false);
      setEditingContent(null);
      fetchItems(); // Re-fetch items to show the new one
    } catch (error) {
      console.error("Error saving content from dialog:", error);
      toast({
        id: toastId,
        title: "Error Saving Content",
        description: "Could not save your content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditContent = (itemToEdit: ContentItem) => {
    // This is a simplified edit. For a real edit, you'd pre-fill the dialog
    // and the dialog's onContentAdd would handle updates.
    setEditingContent(itemToEdit); // Store item for potential pre-fill in dialog (not fully implemented)
    toast({ title: "Edit Action", description: `Editing "${itemToEdit.title}" (Not fully implemented on this page for Firestore updates).`});
    // For now, opening dialog for "new" item, ideally would prefill
    setIsAddContentDialogOpen(true); 
  };

  const handleDeleteContent = async (itemId: string) => {
    const originalItems = [...contentItems];
    setContentItems(prevItems => prevItems.filter(item => item.id !== itemId)); // Optimistic update
    const {id: toastId} = toast({ title: "Deleting Item...", description: "Removing content item."});
    try {
      await deleteContentItemFromFirestore(itemId);
      toast({id: toastId, title: "Content Deleted", description: "The item has been removed.", variant: "default"});
      // No need to call fetchItems() if optimistic update is enough and reliable
    } catch (e) {
      console.error("Error deleting content:", e);
      toast({id: toastId, title: "Error Deleting", description: "Could not delete item. Restoring.", variant: "destructive"});
      setContentItems(originalItems); // Revert optimistic update
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] container mx-auto py-2">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Your Content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center text-destructive">
        <FolderOpen className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-headline font-semibold">Error Loading Content</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button onClick={fetchItems} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-headline font-semibold text-foreground">My Content</h1>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'bg-accent text-accent-foreground' : ''} aria-label="Grid View">
                <LayoutGrid className="h-4 w-4"/>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-accent text-accent-foreground' : ''} aria-label="List View">
                <LayoutList className="h-4 w-4"/>
            </Button>
            <Button variant="outline">
                <ListFilter className="h-4 w-4 mr-2"/>
                Filters
            </Button>
        </div>
      </div>

      {contentItems.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">No content saved yet.</h2>
          <p className="text-muted-foreground mt-2">Start by adding your first item!</p>
          <Button onClick={() => { setEditingContent(null); setIsAddContentDialogOpen(true);}} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Your First Item
          </Button>
        </div>
      ) : (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {contentItems.map(item => (
            <ContentCard
              key={item.id}
              item={item}
              onEdit={handleEditContent}
              onDelete={handleDeleteContent}
            />
          ))}
        </div>
      )}
      <AddContentDialog
        open={isAddContentDialogOpen}
        onOpenChange={setIsAddContentDialogOpen}
        collections={mockCollections}
        onContentAdd={handleAddOrUpdateContentDialog}
        // TODO: Pass editingContent (properly typed) to AddContentDialog for pre-filling form for editing
        // existingContent={editingContent} 
      />
    </div>
  );
}
