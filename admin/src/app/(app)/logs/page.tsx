'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeToLogs, type LogEntry } from '../../../../src/services/loggingService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Server, AlertTriangle, Info, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const getLogLevelStyle = (level: LogEntry['level']) => {
    switch(level) {
        case 'INFO': return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' };
        case 'WARN': return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
        case 'ERROR': return { icon: ShieldX, color: 'text-red-500', bg: 'bg-red-500/10' };
        default: return { icon: Info, color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
};

export default function LogsPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoadingLogs(false);
            return;
        }

        const unsubscribe = subscribeToLogs((fetchedLogs, error) => {
            if (error) {
                console.error("Error subscribing to logs:", error);
                setLogs([]);
            } else {
                setLogs(fetchedLogs);
            }
            setIsLoadingLogs(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (isAuthLoading || isLoadingLogs) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Connecting to Log Stream...</p>
            </div>
        );
    }
    
    if (!user) {
         return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h1 className="text-2xl font-semibold">Access Denied</h1>
                <p className="text-muted-foreground">You must be logged in to view this page.</p>
            </div>
        );
    }

    return (
        <Card className="shadow-lg h-[calc(100vh-18rem)] flex flex-col">
            <CardHeader>
                <CardTitle className="text-2xl font-headline flex items-center">
                    <Server className="h-6 w-6 mr-3 text-primary" />
                    Live Application Logs
                </CardTitle>
                <CardDescription>
                    Real-time logs from server-side operations. New logs appear at the top.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow p-0 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-4 font-mono text-xs space-y-3">
                        {logs.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground">
                                <p>No logs found. Trigger an action like uploading an image to see logs appear here.</p>
                            </div>
                        )}
                        {logs.map(log => {
                            const levelStyle = getLogLevelStyle(log.level);
                            const Icon = levelStyle.icon;
                            return (
                                <div key={log.id} className={cn("p-3 rounded-lg flex items-start gap-3", levelStyle.bg)}>
                                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", levelStyle.color)} />
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-center">
                                            <Badge variant="outline" className={cn("font-bold", levelStyle.color)}>{log.level}</Badge>
                                            <span className="text-muted-foreground">{format(log.timestamp.toDate(), 'HH:mm:ss.SSS')}</span>
                                        </div>
                                        <p className="mt-1 whitespace-pre-wrap break-words">{log.message}</p>
                                        {log.details && (
                                            <pre className="mt-2 p-2 bg-black/70 text-white rounded-md text-[10px] leading-relaxed overflow-x-auto">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
