'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { subscribeToContentItems, getUniqueContentTypesFromItems } from '@/services/contentService';
import type { ContentItem } from '@/types';
import { Loader2, ClipboardList, FolderOpen, Newspaper, Film, StickyNote, Github, MessagesSquare, BookOpen, Mic, FileImage } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

const predefinedContentTypes: Record<string, { icon: React.ElementType, name: string }> = {
  Article: { icon: BookOpen, name: 'Articles' },
  Note: { icon: StickyNote, name: 'Notes' },
  Image: { icon: FileImage, name: 'Images' },
  'Voice Recording': { icon: Mic, name: 'Voice Recordings' },
  Movie: { icon: Film, name: 'Movies' },
  PDF: { icon: BookOpen, name: 'PDFs' },
  Post: { icon: Newspaper, name: 'Posts' },
  Reel: { icon: Film, name: 'Reels' },
  Repositories: { icon: Github, name: 'Repositories' },
  Tweet: { icon: MessagesSquare, name: 'Tweets' },
  Thread: { icon: MessagesSquare, name: 'Threads' },
};

export default function AllContentTypesPage() {
  const { user } = useAuth();
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToContentItems(user.uid, (items, error) => {
      if (error) {
        console.error("Error fetching items for content types:", error);
      } else {
        const uniqueTypes = getUniqueContentTypesFromItems(items);
        setContentTypes(uniqueTypes);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your content types...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex items-center mb-6">
        <ClipboardList className="h-7 w-7 mr-3 text-primary" />
        <h1 className="text-3xl font-headline font-semibold text-foreground">Content Types</h1>
      </div>

      {contentTypes.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">No content saved yet.</h2>
          <p className="text-muted-foreground mt-2">When you add content, its type will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {contentTypes.map(type => {
            const typeDetails = predefinedContentTypes[type] || { icon: StickyNote, name: type };
            const Icon = typeDetails.icon;
            return (
              <Link key={type} href={`/content-types/${encodeURIComponent(type)}`} legacyBehavior>
                <a className="block">
                  <Card className="hover:bg-muted/50 hover:shadow-lg transition-all h-full">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Icon className="h-6 w-6 text-primary" />
                        <CardTitle className="text-lg">{typeDetails.name}</CardTitle>
                      </div>
                    </CardHeader>
                  </Card>
                </a>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  );
}
