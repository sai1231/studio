
'use client';
import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import type { Collection, ContentItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addContentItem, getCollections, uploadFile } from '@/services/contentService';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, FileText, ImageUp, Mic } from 'lucide-react'; // Added icons

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const { toast } = useToast();
  const imageUploadInputRef = useRef<HTMLInputElement>(null);

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
    const currentToast = toast({
      title: "Saving Content...",
      description: "Please wait while your content is being saved.",
    });
    try {
      await addContentItem({
        ...newContentData,
      });
      currentToast.update({
        id: currentToast.id,
        title: "Content Saved!",
        description: `"${newContentData.title}" (${newContentData.type}) has been saved.`,
      });
      setIsAddContentDialogOpen(false);
      // TODO: Implement a way to refresh the dashboard list or use global state for mock data
    } catch (error) {
      console.error("Error saving content from dialog:", error);
      currentToast.update({
        id: currentToast.id,
        title: "Error Saving Content",
        description: "Could not save your content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageFileSelected = async (file: File) => {
    const currentToast = toast({
      title: "Processing Image...",
      description: "Preparing your image.",
    });

    try {
      const imagePath = `contentImages/${Date.now()}_${file.name}`; 
      const downloadURL = await uploadFile(file, imagePath); 

      currentToast.update({
        id: currentToast.id,
        title: "Saving Image...",
        description: "Adding your image to your collection.",
      });
      
      const defaultCollectionId = collections.length > 0 ? collections[0].id : "1";

      const newImageContent: Omit<ContentItem, 'id' | 'createdAt'> = {
        type: 'image',
        title: file.name || 'Uploaded Image',
        description: `Uploaded image: ${file.name}`,
        imageUrl: downloadURL,
        tags: [{id: 'upload', name: 'upload'}], 
        collectionId: defaultCollectionId, 
      };
      
      await addContentItem(newImageContent);

      currentToast.update({
        id: currentToast.id,
        title: "Image Saved!",
        description: `"${newImageContent.title}" has been saved.`,
      });
      // TODO: Implement refresh for dashboard
    } catch (error) {
      console.error("Error processing image upload:", error);
      currentToast.update({
        id: currentToast.id,
        title: "Image Upload Failed",
        description: "Could not process your image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUploadImageClick = () => {
    imageUploadInputRef.current?.click();
  };

  const handleImageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageFileSelected(file);
      if (event.target) event.target.value = ''; // Reset file input
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
          // Removed onAddContentClick, onImageFileSelected, onRecordVoiceClick props
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto">
          {children}
        </main>
      </div>
      <AddContentDialog
        open={isAddContentDialogOpen}
        onOpenChange={setIsAddContentDialogOpen}
        collections={collections} 
        onContentAdd={handleAddContentFromDialog} 
      />
      
      {/* Floating Action Button with Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 rounded-full h-16 w-16 shadow-xl z-40 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center"
            aria-label="Add Content Menu"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={16} className="w-56 mb-1">
          <DropdownMenuItem onClick={() => setIsAddContentDialogOpen(true)} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            <span>Add Link / Note</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleUploadImageClick} className="cursor-pointer">
            <ImageUp className="mr-2 h-4 w-4" />
            <span>Upload Image</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRecordVoiceClick} className="cursor-pointer">
            <Mic className="mr-2 h-4 w-4" />
            <span>Record Voice</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        type="file"
        ref={imageUploadInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageInputChange}
      />
    </div>
  );
}
