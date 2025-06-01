'use client';
import type React from 'react';
import { useState } from 'react';
import AppHeader from '@/components/core/app-header';
import AppSidebar from '@/components/core/app-sidebar';
import AddLinkDialog from '@/components/core/add-link-dialog';
import type { Collection, LinkItem } from '@/types'; // Assuming types are defined
import { useToast } from '@/hooks/use-toast';

// Mock data for collections - replace with actual data fetching
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
  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAddLink = (newLink: Omit<LinkItem, 'id' | 'createdAt'>) => {
    console.log('New link added:', newLink);
    // Here you would typically update your state or call an API
    // For now, we'll just show a toast message
    toast({
      title: "Link Added!",
      description: `"${newLink.title}" has been saved.`,
    });
    setIsAddLinkDialogOpen(false); // Close dialog after adding
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-col flex-1 md:ml-64"> {/* Adjust margin for sidebar width */}
        <AppHeader 
          onAddLinkClick={() => setIsAddLinkDialogOpen(true)} 
          open={isAddLinkDialogOpen} 
          onOpenChange={setIsAddLinkDialogOpen}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background overflow-auto">
          {children}
        </main>
      </div>
      <AddLinkDialog
        open={isAddLinkDialogOpen}
        onOpenChange={setIsAddLinkDialogOpen}
        collections={mockCollections}
        onLinkAdd={handleAddLink}
      />
    </div>
  );
}
