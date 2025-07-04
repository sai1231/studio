'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { subscribeToContentItems, getUniqueTagsFromItems } from '@/services/contentService';
import type { Tag } from '@/types';
import { Loader2, Tag as TagIcon, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AllTagsPage() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToContentItems(user.uid, (items, error) => {
      if (error) {
        console.error("Error fetching items for tags:", error);
      } else {
        const uniqueTags = getUniqueTagsFromItems(items);
        setTags(uniqueTags);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);
  
  const tagColorPalettes = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200 dark:border-blue-500/20',
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200 dark:border-green-500/20',
    'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200 dark:border-purple-500/20',
    'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200 border-pink-200 dark:border-pink-500/20',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200 dark:border-yellow-500/20',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200 border-indigo-200 dark:border-indigo-500/20',
  ];

  const getTagStyles = (tagName: string): string => {
    let hash = 0;
    if (!tagName || tagName.length === 0) return tagColorPalettes[0];
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    const index = Math.abs(hash) % tagColorPalettes.length;
    return tagColorPalettes[index];
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your tags...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex items-center mb-6">
        <TagIcon className="h-7 w-7 mr-3 text-primary" />
        <h1 className="text-3xl font-headline font-semibold text-foreground">All Tags</h1>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">No tags found.</h2>
          <p className="text-muted-foreground mt-2">Add tags to your content items to see them here.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map(tag => (
            <Link key={tag.id} href={`/tags/${encodeURIComponent(tag.name)}`} legacyBehavior>
              <a>
                <Badge className={`px-4 py-2 text-sm rounded-lg cursor-pointer transition-transform hover:scale-105 ${getTagStyles(tag.name)}`}>
                  #{tag.name}
                </Badge>
              </a>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
