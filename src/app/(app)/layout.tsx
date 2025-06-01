
'use client';
import type React from 'react';
import { useState } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddContentDialog from '@/components/core/add-content-dialog'; // Updated import
import type { Collection, LinkItem } from '@/types'; 
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
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false); // Renamed state
  const { toast } = useToast();

  // Updated handler name and type (though type is simplified for now)
  const handleAddContent = (newContent: Omit<LinkItem, 'id' | 'createdAt'>) => { 
    console.log('New content added:', newContent);
    toast({
      title: "Content Added!",
      // Potentially make this message more generic or type-specific
      description: `"${newContent.title}" has been saved.`, 
    });
    setIsAddContentDialogOpen(false); 
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1 md:ml-64"> 
        <AppHeader 
          onAddContentClick={() => setIsAddContentDialogOpen(true)} // Updated prop name
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto">
          {children}
        </main>
      </div>
      <AddContentDialog // Updated component
        open={isAddContentDialogOpen}
        onOpenChange={setIsAddContentDialogOpen}
        collections={mockCollections}
        onContentAdd={handleAddContent} // Updated prop name
      />
    </div>
  );
}
