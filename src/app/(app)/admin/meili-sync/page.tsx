'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseZap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DeprecatedSyncPage() {
    const router = useRouter();

    return (
        <div className="container mx-auto py-8 flex items-center justify-center min-h-[calc(100vh-12rem)]">
            <Card className="max-w-lg text-center shadow-lg">
                <CardHeader>
                    <div className="mx-auto bg-muted/50 rounded-full p-3 w-fit">
                        <DatabaseZap className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <CardTitle className="mt-4">Search Sync Page Removed</CardTitle>
                    <CardDescription>
                        This page was part of a previous search implementation that has since been replaced.
                        The search system now updates automatically and no longer requires manual syncing.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/dashboard')}>
                        Back to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
