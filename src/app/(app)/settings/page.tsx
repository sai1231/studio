
'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { ThemeToggle } from '@/components/core/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, Bell, Database, Palette, HardDrive, Search, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getIndexStats, reindexAllContent } from '@/services/meilisearchService';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string | number; icon: React.ElementType; isLoading?: boolean }) => (
    <div className="flex items-center p-4 bg-muted/50 rounded-lg">
        <Icon className="h-8 w-8 text-primary mr-4" />
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? <Skeleton className="h-6 w-24 mt-1" /> : <p className="text-2xl font-bold">{value.toLocaleString()}</p>}
        </div>
    </div>
);


export default function SettingsPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isReindexing, setIsReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
      setIsLoadingStats(true);
      setError(null);
      try {
          const result = await getIndexStats();
          setStats(result);
      } catch (e: any) {
          setError(e.message || "Could not connect to Meilisearch.");
          setStats(null);
      } finally {
          setIsLoadingStats(false);
      }
  }, []);

  useEffect(() => {
      fetchStats();
  }, [fetchStats]);

  const handleReindex = async () => {
      setIsReindexing(true);
      toast({
          title: 'Re-indexing Started',
          description: 'Fetching all content from Firestore and sending to Meilisearch. This may take a moment...',
      });
      try {
          const { count } = await reindexAllContent();
          toast({
              title: 'Re-indexing Complete',
              description: `${count} documents were successfully indexed.`,
          });
          await fetchStats(); // Refresh stats after re-indexing
      } catch (e: any) {
          toast({
              title: 'Re-indexing Failed',
              description: e.message || 'An unknown error occurred during re-indexing.',
              variant: 'destructive',
          });
      } finally {
          setIsReindexing(false);
      }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-3xl font-headline font-semibold text-foreground mb-8">Settings</h1>

      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Palette className="h-5 w-5 mr-2 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of your Mäti experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-1 rounded-lg">
              <span className="text-sm font-medium text-foreground">
                Theme
              </span>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Search className="mr-2" /> Meilisearch Status</CardTitle>
                <CardDescription>
                    Health of your self-hosted search index.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error ? (
                    <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5" />
                        <div>
                            <p className="font-semibold">Connection Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <StatCard
                            title="Total Documents"
                            value={stats?.numberOfDocuments || 0}
                            icon={Database}
                            isLoading={isLoadingStats}
                        />
                        <StatCard
                            title="Index Status"
                            value={stats?.isIndexing ? 'Indexing' : 'Idle'}
                            icon={stats?.isIndexing ? Loader2 : CheckCircle}
                            isLoading={isLoadingStats}
                        />
                    </div>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center">
                    <HardDrive className="h-5 w-5 mr-2 text-primary" />
                    Data Synchronization
                </CardTitle>
                <CardDescription>
                    If your search results seem out of sync, you can manually trigger a full re-index of all your content.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    This action reads all content from your Firestore database and sends it to Meilisearch.
                    This is useful after setting up the app for the first time, or for recovery if the search server was down and missed updates.
                </p>
                <Button onClick={handleReindex} disabled={isReindexing}>
                    {isReindexing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2" />}
                    {isReindexing ? 'Re-indexing...' : 'Re-index All Content'}
                </Button>
            </CardContent>
        </Card>

        <Card className="shadow-lg opacity-70">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <UserCog className="h-5 w-5 mr-2 text-primary" />
              Account
            </CardTitle>
            <CardDescription>
              Manage your account details and preferences. (Placeholder)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Change Password</Label>
              <Button variant="outline" className="mt-1 w-full sm:w-auto" disabled>Coming Soon</Button>
            </div>
            <div>
              <Label className="text-sm font-medium">Export Your Data</Label>
              <Button variant="outline" className="mt-1 w-full sm:w-auto" disabled>Coming Soon</Button>
            </div>
             <div>
              <Label className="text-sm font-medium text-destructive">Delete Account</Label>
              <Button variant="destructive" className="mt-1 w-full sm:w-auto" disabled>Coming Soon</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg opacity-70">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Bell className="h-5 w-5 mr-2 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure your notification settings. (Placeholder)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Notification preferences will be available here.</p>
             <Button variant="outline" className="mt-2 w-full sm:w-auto" disabled>Configure Notifications</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={`block text-sm font-medium text-foreground ${className || ''}`}>{children}</p>
);
