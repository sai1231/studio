
'use client';
import type React from 'react';
import { useState } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog';
import type { Collection, ContentItem } from '@/types'; // Updated to ContentItem
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

  const handleAddContent = (newContent: Omit<ContentItem, 'id' | 'createdAt'>) => {
    console.log('New content added:', newContent);
    // This function might be called by DashboardPage or other pages to update their local state
    // For now, AppLayout just shows a global toast
    toast({
      title: "Content Added!",
      description: `"${newContent.title}" (${newContent.type}) has been saved.`,
    });
    setIsAddContentDialogOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1 md:ml-64">
        <AppHeader
          onAddContentClick={() => setIsAddContentDialogOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto">
          {children}
        </main>
      </div>
      <AddContentDialog
        open={isAddContentDialogOpen}
        onOpenChange={setIsAddContentDialogOpen}
        collections={mockCollections}
        onContentAdd={handleAddContent} // This prop might be more for global feedback or direct add from here
                                         // DashboardPage has its own handler to update its state.
      />
    </div>
  );
}
