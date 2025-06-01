
'use client';
import type React from 'react';
import { useState } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import type { Collection, ContentItem, ContentItemType } from '@/types';
import { useToast } from '@/hooks/use-toast';

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

  const handleImageFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const newImageContent: Omit<ContentItem, 'id' | 'createdAt'> = {
        type: 'image',
        title: file.name || 'Uploaded Image',
        description: `Uploaded image: ${file.name}`,
        imageUrl: imageUrl,
        tags: [{id: 'upload', name: 'upload'}], // Default tag
      };
      console.log('New image content:', newImageContent);
      // TODO: Add this to the main content list (e.g., via global state or API call)
      toast({
        title: "Image Selected",
        description: `"${newImageContent.title}" is ready to be saved (not fully implemented yet). Image preview functionality will show in card once saved to list.`,
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
