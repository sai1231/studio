
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, HardDrive, AlertTriangle, Database, CheckCircle, Search } from 'lucide-react';
import { getIndexStats, reindexAllContent } from '@/services/meilisearchService';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string | number; icon: React.ElementType; isLoading?: boolean }) => (
    <div className="flex items-center p-4 bg-muted/50 rounded-lg">
        <Icon className="h-8 w-8 text-primary mr-4" />
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? <Skeleton className="h-6 w-24 mt-1" /> : <p className="text-2xl font-bold">{value.toLocaleString()}</p>}
        </div>
    </div>
);

export default function SystemPage() {
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
        <div className="space-y-6">
            <h1 className="text-2xl font-headline font-semibold text-foreground flex items-center">
                <HardDrive className="mr-3 h-6 w-6 text-primary" />
                System Management
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Search className="mr-2" /> Meilisearch Status</CardTitle>
                    <CardDescription>
                        Statistics and health of your self-hosted search index.
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
                    <CardTitle>Data Synchronization</CardTitle>
                    <CardDescription>
                        If your search results seem out of sync, you can manually trigger a full re-index of all your content.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        This action reads all content from your Firestore database and sends it to Meilisearch.
                        This is useful for recovery if the search server was down and missed updates.
                    </p>
                    <Button onClick={handleReindex} disabled={isReindexing}>
                        {isReindexing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2" />}
                        {isReindexing ? 'Re-indexing...' : 'Re-index All Content'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
