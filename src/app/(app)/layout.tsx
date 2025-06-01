
'use client';
import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import type { Collection, ContentItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addContentItem, getCollections, uploadFile } from '@/services/contentService';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const { toast, update } = useToast();

  const fetchCollections = useCallback(async () => {
    try {
      const fetchedCollections = await getCollections();
      setCollections(fetchedCollections);
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast({ title: "Error", description: "Could not load collections.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleAddContentFromDialog = async (newContentData: Omit<ContentItem, 'id' | 'createdAt'>) => {
    const { id: toastId } = toast({
      title: "Saving Content...",
      description: "Please wait while your content is being saved.",
    });
    try {
      await addContentItem({
        ...newContentData,
        // collectionId is already part of newContentData from the dialog
      });
      update({
        id: toastId,
        title: "Content Saved!",
        description: `"${newContentData.title}" (${newContentData.type}) has been saved.`,
      });
      setIsAddContentDialogOpen(false);
      // TODO: Implement a way to refresh the dashboard list or use global state for mock data
      // For now, user might need to manually refresh dashboard page if it's open
    } catch (error) {
      console.error("Error saving content from dialog:", error);
      update({
        id: toastId,
        title: "Error Saving Content",
        description: "Could not save your content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageFileSelected = async (file: File) => {
    const { id: toastId } = toast({
      title: "Processing Image...",
      description: "Preparing your image.",
    });

    try {
      const imagePath = `contentImages/${Date.now()}_${file.name}`; // Path for mock upload
      const downloadURL = await uploadFile(file, imagePath); // Mock upload

      update({
        id: toastId,
        title: "Saving Image...",
        description: "Adding your image to the collection.",
      });
      
      const defaultCollectionId = collections.length > 0 ? collections[0].id : "1"; // Fallback

      const newImageContent: Omit<ContentItem, 'id' | 'createdAt'> = {
        type: 'image',
        title: file.name || 'Uploaded Image',
        description: `Uploaded image: ${file.name}`,
        imageUrl: downloadURL,
        tags: [{id: 'upload', name: 'upload'}], 
        collectionId: defaultCollectionId,
      };
      
      await addContentItem(newImageContent);

      update({
        id: toastId,
        title: "Image Saved!",
        description: `"${newImageContent.title}" has been saved.`,
      });
      // TODO: Implement refresh for dashboard
    } catch (error) {
      console.error("Error processing image upload:", error);
      update({
        id: toastId,
        title: "Image Upload Failed",
        description: "Could not process your image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRecordVoiceClick = () => {
    toast({
      title: "Voice Recording",
      description: "Voice recording feature coming soon!",
    });
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1 md:ml-64">
        <AppHeader
          onAddContentClick={() => setIsAddContentDialogOpen(true)}
          onImageFileSelected={handleImageFileSelected}
          onRecordVoiceClick={handleRecordVoiceClick}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto">
          {children}
        </main>
      </div>
      <AddContentDialog
        open={isAddContentDialogOpen}
        onOpenChange={setIsAddContentDialogOpen}
        collections={collections} // Pass fetched/mocked collections
        onContentAdd={handleAddContentFromDialog} 
      />
    </div>
  );
}
