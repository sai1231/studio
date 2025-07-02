'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseZap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DeprecatedSyncPage() {
    const router = useRouter();

    return (
        <div className="container mx-auto py-8 flex items-center justify-center">
            <Card className="max-w-lg text-center shadow-lg">
                <CardHeader>
                    <div className="mx-auto bg-muted/50 rounded-full p-3 w-fit">
                        <DatabaseZap className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <CardTitle className="mt-4">Search Sync Page Removed</CardTitle>
                    <CardDescription>
                        This page was part of a previous search implementation that has since been replaced.
                        The application no longer requires a manual search sync.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/admin/dashboard')}>
                        Back to Admin Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
