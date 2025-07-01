
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, ShieldCheck, ShieldAlert, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { resyncAllData } from '@/services/meilisearchService';

export default function MeiliSyncPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ count: number; error?: string } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSync = async () => {
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to perform this action.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await resyncAllData(user.uid);
      setSyncResult({ count: result.count });
      toast({
        title: 'Sync Successful',
        description: `${result.count} items have been sent to the search index. It may take a few moments for them to be searchable.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setSyncResult({ count: 0, error: errorMessage });
      toast({
        title: 'Sync Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Zap className="h-5 w-5 mr-2 text-primary" />
            Search Index Synchronization
          </CardTitle>
          <CardDescription>
            This tool will sync all your existing content with the search engine. Run this if your search results seem incomplete or after a system update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border bg-muted/50 p-8">
            <p className="text-center text-sm text-muted-foreground">
              Click the button below to start the synchronization process. This may take a few moments depending on the number of items you have saved.
            </p>
            <Button onClick={handleSync} disabled={isSyncing} size="lg">
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync All Content to Search'
              )}
            </Button>
          </div>
          {syncResult && (
            <div className="mt-6">
              {syncResult.error ? (
                <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                  <ShieldAlert className="h-6 w-6 shrink-0" />
                  <div>
                    <h3 className="font-semibold">Sync Failed</h3>
                    <p className="text-sm">{syncResult.error}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-700 dark:text-green-400">
                  <ShieldCheck className="h-6 w-6 shrink-0" />
                  <div>
                    <h3 className="font-semibold">Sync Complete</h3>
                    <p className="text-sm">Successfully submitted {syncResult.count} items for indexing.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
