
'use client';
import type React from 'react';
import { useState } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import type { Collection, ContentItem, ContentItemType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { analyzeImageContent } from '@/ai/flows/analyze-image-content'; // Import the new flow

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

  const handleAddContentFromDialog = (newContent: Omit<ContentItem, 'id' | 'createdAt'>) => {
    console.log('New content added via Layout Dialog:', newContent);
    // In a real app, this would likely update a global state or call an API
    // For now, it just shows a toast. DashboardPage manages its own list.
    // TODO: Update dashboard list if open or provide a global state update mechanism
    toast({
      title: "Content Saved!",
      description: `"${newContent.title}" (${newContent.type}) has been saved.`,
    });
    setIsAddContentDialogOpen(false);
  };

  const handleImageFileSelected = async (file: File) => {
    const { id: toastId } = toast({
      title: "Processing Image...",
      description: "Reading file and preparing for analysis.",
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl) {
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
        analysisResult = await analyzeImageContent({ imageDataUri: imageUrl });
      } catch (error) {
        console.error("Error analyzing image:", error);
        toast({
          id: toastId,
          title: "AI Analysis Failed",
          description: "Could not analyze the image with AI. Saving image without extracted data.",
          variant: "destructive",
        });
        analysisResult = { dominantColors: [], extractedText: "" }; // Proceed without AI data
      }

      const newImageContent: Omit<ContentItem, 'id' | 'createdAt'> = {
        type: 'image',
        title: file.name || 'Uploaded Image',
        description: `Uploaded image: ${file.name}`,
        imageUrl: imageUrl,
        tags: [{id: 'upload', name: 'upload'}], // Default tag
        collectionId: '', // TODO: Allow user to select collection for direct uploads
        dominantColors: analysisResult.dominantColors,
        extractedText: analysisResult.extractedText,
      };
      
      console.log('New image content with AI analysis:', newImageContent);
      // TODO: Add this to the main content list (e.g., via global state or API call)
      toast({
        id: toastId,
        title: "Image Processed!",
        description: `"${newImageContent.title}" analyzed. Colors: ${newImageContent.dominantColors?.join(', ') || 'N/A'}. Text: ${newImageContent.extractedText ? 'Found' : 'None'}.`,
      });
    };
    reader.onerror = () => {
      toast({
        id: toastId,
        title: "Error Reading File",
        description: "An error occurred while reading the image file.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
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
