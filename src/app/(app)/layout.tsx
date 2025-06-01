
'use client';
import type React from 'react';
import { useState } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import type { Collection, ContentItem, ContentItemFirestoreData } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { analyzeImageContent } from '@/ai/flows/analyze-image-content';
import { uploadFile, addContentItem } from '@/services/contentService'; // Import Firebase services

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
  const { toast } = useToast();

  const handleAddContentFromDialog = async (newContentData: Omit<ContentItemFirestoreData, 'createdAt' | 'tags'> & { tags: ContentItem['tags']}) => {
    const { id: toastId } = toast({
      title: "Saving Content...",
      description: "Please wait while your content is being saved.",
    });
    try {
      // Assert that tags is of type Tag[] for Firestore data
      const firestoreReadyTags: ContentItemFirestoreData['tags'] = newContentData.tags;

      await addContentItem({
        ...newContentData,
        tags: firestoreReadyTags, // Use the asserted tags
        // userId: "TODO_CURRENT_USER_ID", // TODO: Integrate Firebase Auth
      });
      toast({
        id: toastId,
        title: "Content Saved!",
        description: `"${newContentData.title}" (${newContentData.type}) has been saved.`,
      });
      setIsAddContentDialogOpen(false);
      // TODO: Implement a way to refresh the dashboard list or use global state
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

  const handleImageFileSelected = async (file: File) => {
    const { id: toastId } = toast({
      title: "Processing Image...",
      description: "Reading file and preparing for analysis.",
    });

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (!dataUrl) {
        toast({
          id: toastId,
          title: "Error Reading File",
          description: "Could not read the image file.",
          variant: "destructive",
        });
        return;
      }

      toast({
        id: toastId,
        title: "Analyzing Image...",
        description: "Extracting colors and text. This may take a moment.",
      });

      let analysisResult;
      try {
        analysisResult = await analyzeImageContent({ imageDataUri: dataUrl });
      } catch (error) {
        console.error("Error analyzing image:", error);
        toast({
          id: toastId,
          title: "AI Analysis Failed",
          description: "Could not analyze the image with AI. Proceeding without extracted data.",
          variant: "destructive",
        });
        // Fallback if AI analysis fails
        analysisResult = { dominantColors: [], extractedText: "" };
      }
      
      toast({
        id: toastId,
        title: "Uploading Image...",
        description: "Saving your image to secure storage.",
      });

      // TODO: Determine a proper path, perhaps include userId if available
      const imagePath = `contentImages/${Date.now()}_${file.name}`;
      const downloadURL = await uploadFile(file, imagePath);

      const newImageContent: Omit<ContentItemFirestoreData, 'createdAt'> = {
        type: 'image',
        title: file.name || 'Uploaded Image',
        description: `Uploaded image: ${file.name}`,
        imageUrl: downloadURL,
        tags: [{id: 'upload', name: 'upload'}], // Default tag
        collectionId: '', // TODO: Allow user to select collection for direct uploads
        dominantColors: analysisResult.dominantColors,
        extractedText: analysisResult.extractedText,
        // userId: "TODO_CURRENT_USER_ID", // TODO: Integrate Firebase Auth
      };
      
      await addContentItem(newImageContent);

      toast({
        id: toastId,
        title: "Image Saved!",
        description: `"${newImageContent.title}" uploaded and analyzed. Colors: ${newImageContent.dominantColors?.join(', ') || 'N/A'}. Text: ${newImageContent.extractedText ? 'Found' : 'None'}.`,
      });
       // TODO: Implement a way to refresh the dashboard list or use global state
    } catch (error) {
      console.error("Error processing image upload:", error);
      toast({
        id: toastId,
        title: "Image Upload Failed",
        description: "Could not upload or process your image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRecordVoiceClick = () => {
    // TODO: Implement voice recording dialog/logic
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
