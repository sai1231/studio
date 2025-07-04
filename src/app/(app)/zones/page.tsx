'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { subscribeToZones } from '@/services/contentService';
import type { Zone } from '@/types';
import { Loader2, Bookmark, FolderOpen } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Bookmark as BookmarkIcon, Briefcase, Home, Library } from 'lucide-react';

const iconMap: { [key: string]: React.ElementType } = {
  Briefcase,
  Home,
  Library,
  Bookmark: BookmarkIcon,
};

const getIconComponent = (iconName?: string): React.ElementType => {
  if (iconName && iconMap[iconName]) {
    return iconMap[iconName];
  }
  return BookmarkIcon; 
};


export default function AllZonesPage() {
  const { user } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToZones(user.uid, (fetchedZones, error) => {
      if (error) {
        console.error("Error fetching zones:", error);
      } else {
        setZones(fetchedZones);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your zones...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <div className="flex items-center mb-6">
        <Bookmark className="h-7 w-7 mr-3 text-primary" />
        <h1 className="text-3xl font-headline font-semibold text-foreground">All Zones</h1>
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium text-muted-foreground">No zones created yet.</h2>
          <p className="text-muted-foreground mt-2">Create zones to organize your content.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {zones.map(zone => {
            const Icon = getIconComponent(zone.icon);
            return (
              <Link key={zone.id} href={`/zones/${zone.id}`} legacyBehavior>
                <a className="block">
                  <Card className="hover:bg-muted/50 hover:shadow-lg transition-all h-full">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Icon className="h-6 w-6 text-primary" />
                        <CardTitle className="text-lg">{zone.name}</CardTitle>
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
