
'use client';
import type React from 'react';
import { useState, useEffect } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import type { Collection, ContentItem, ContentItemFirestoreData, Tag as AppTag } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { analyzeImageContent } from '@/ai/flows/analyze-image-content';
import { uploadFile, addContentItem } from '@/services/contentService';
import { useImageColor } from 'use-image-color';

const mockCollections: Collection[] = [
  { id: '1', name: 'Work Projects' },
  { id: '2', name: 'Reading List' },
  { id: '3', name: 'Recipes' },
];

interface ProcessingImageDetails {
  file: File;
  dataUrl: string;
  toastId: string;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const { toast, dismiss, update } = useToast();

  const [processingImageDetails, setProcessingImageDetails] = useState<ProcessingImageDetails | null>(null);
  const [aiExtractedText, setAiExtractedText] = useState<string | null>(null);
  const [isAiProcessingText, setIsAiProcessingText] = useState(false);
  
  const { colors: extractedImageColors, loading: imageColorsLoading, error: imageColorsError } = useImageColor(
    processingImageDetails?.dataUrl || null, 
    { cors: true, colors: 5, format: 'hex' }
  );

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
    const { id: currentToastId } = toast({
      title: "Processing Image...",
      description: "Reading file and preparing for analysis.",
    });

    let dataUrl: string;
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (readError) {
      console.error("Error reading file:", readError);
      update({
        id: currentToastId,
        title: "Error Reading File",
        description: "Could not read the image file.",
        variant: "destructive",
      });
      return;
    }
    
    setProcessingImageDetails({ file, dataUrl, toastId: currentToastId });
    setAiExtractedText(null);
    setIsAiProcessingText(true);

    update({
      id: currentToastId,
      title: "Analyzing Image...",
      description: "Extracting text and colors. This may take a moment.",
    });

    try {
      const analysisResult = await analyzeImageContent({ imageDataUri: dataUrl });
      setAiExtractedText(analysisResult.extractedText);
    } catch (error) {
      console.error("Error analyzing image text with AI:", error);
      setAiExtractedText(""); // Default to empty string on error
    } finally {
      setIsAiProcessingText(false);
    }
  };
  
  useEffect(() => {
    if (processingImageDetails && !isAiProcessingText && !imageColorsLoading) {
      const { file, dataUrl, toastId } = processingImageDetails;

      const saveImage = async () => {
        update({
          id: toastId,
          title: "Finalizing Image Data...",
          description: "Preparing to upload your image.",
        });

        const finalDominantColors = imageColorsError || !extractedImageColors ? [] : extractedImageColors;
        const finalTextToSave = aiExtractedText === null ? "" : aiExtractedText;

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
            collectionId: '', // TODO: Allow user to select collection
            dominantColors: finalDominantColors,
            extractedText: finalTextToSave,
          };
          
          await addContentItem(newImageContent);

          update({
            id: toastId,
            title: "Image Saved!",
            description: `"${newImageContent.title}" saved. Colors: ${finalDominantColors.join(', ') || 'N/A'}. Text: ${finalTextToSave ? 'Found' : 'None'}.`,
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
        } finally {
          setProcessingImageDetails(null); // Reset to allow next upload
          setAiExtractedText(null);
        }
      };

      saveImage();
    }
  }, [processingImageDetails, isAiProcessingText, aiExtractedText, extractedImageColors, imageColorsLoading, imageColorsError, toast, update, dismiss]);


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
