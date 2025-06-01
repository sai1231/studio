
'use client';
import type React from 'react';
import { useState } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import type { Collection, ContentItemFirestoreData, Tag as AppTag } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { uploadFile, addContentItem } from '@/services/contentService';

const mockCollections: Collection[] = [
  { id: '1', name: 'Work Projects' },
  { id: '2', name: 'Reading List' },
  { id: '3', name: 'Recipes' },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const { toast, update } = useToast();

  const handleAddContentFromDialog = async (newContentData: Omit<ContentItemFirestoreData, 'createdAt' | 'tags'> & { tags: AppTag[]}) => {
    const { id: toastId } = toast({
      title: "Saving Content...",
      description: "Please wait while your content is being saved.",
    });
    try {
      const firestoreReadyTags: ContentItemFirestoreData['tags'] = newContentData.tags.map(tag => ({ id: tag.id, name: tag.name }));

      await addContentItem({
        ...newContentData,
        tags: firestoreReadyTags,
        // Ensure collectionId is passed; it's now mandatory in types
        // If newContentData might not have it, ensure a default or error handling
        collectionId: newContentData.collectionId || "default_collection_id", // Or handle if missing
      });
      update({
        id: toastId,
        title: "Content Saved!",
        description: `"${newContentData.title}" (${newContentData.type}) has been saved.`,
      });
      setIsAddContentDialogOpen(false);
      // TODO: Implement a way to refresh the dashboard list or use global state
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
      description: "Reading file and preparing for upload.",
    });

    try {
      update({
        id: toastId,
        title: "Uploading Image...",
        description: "Saving your image to secure storage.",
      });

      const imagePath = `contentImages/${Date.now()}_${file.name}`;
      const downloadURL = await uploadFile(file, imagePath);

      const newImageContent: Omit<ContentItemFirestoreData, 'createdAt'> = {
        type: 'image',
        title: file.name || 'Uploaded Image',
        description: `Uploaded image: ${file.name}`,
        imageUrl: downloadURL,
        tags: [{id: 'upload', name: 'upload'}], 
        collectionId: mockCollections[0]?.id || "default_collection_id", // TODO: Allow user to select collection; for now, default to first mock or a placeholder
        // userId: "TODO_CURRENT_USER_ID", // Add when auth is ready
      };
      
      await addContentItem(newImageContent);

      update({
        id: toastId,
        title: "Image Saved!",
        description: `"${newImageContent.title}" has been saved.`,
      });
      // TODO: Implement a way to refresh the dashboard list or use global state
    } catch (error) {
      console.error("Error processing image upload:", error);
      update({
        id: toastId,
        title: "Image Upload Failed",
        description: "Could not upload or process your image. Please try again.",
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
        collections={mockCollections}
        onContentAdd={handleAddContentFromDialog} 
      />
    </div>
  );
}
