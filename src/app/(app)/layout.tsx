
'use client';
import type React from 'react';
import { useState } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import type { Collection, ContentItem } from '@/types';
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

  // This handler is for the AddContentDialog triggered from AppLayout
  const handleAddContentFromDialog = (newContent: Omit<ContentItem, 'id' | 'createdAt'>) => {
    console.log('New content added via Layout Dialog:', newContent);
    // In a real app, this would likely update a global state or call an API
    // For now, it just shows a toast. DashboardPage manages its own list.
    toast({
      title: "Content Added!",
      description: `"${newContent.title}" (${newContent.type}) has been saved.`,
    });
    setIsAddContentDialogOpen(false);
  };

  const handleImageFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const newImageContent: Omit<ContentItem, 'id' | 'createdAt' | 'audioUrl'> = {
        type: 'image',
        title: file.name.replace(/\.[^/.]+$/, "") || "Uploaded Image",
        imageUrl: dataUrl,
        tags: [], 
      };
      console.log('Direct image upload prepared:', newImageContent);
      toast({
        title: "Image Selected",
        description: `"${newImageContent.title}" prepared. Adding to list not yet implemented from header.`,
      });
    };
    reader.onerror = () => {
      toast({ title: "Error Reading File", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const handleRecordVoiceClick = () => {
    // This will eventually open a voice recording dialog/modal
    console.log('Record Voice button clicked');
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
          onRecordVoiceClick={handleRecordVoiceClick} // Pass the new handler
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
