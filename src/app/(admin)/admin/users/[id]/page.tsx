
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CreditCard, BarChart2, Mail, Calendar, Eye, Loader2, AlertTriangle } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getUserById, type AdminUser } from "@/services/adminService";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

const getInitials = (name?: string | null) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
        return `${names[0][0]}${names[names.length-1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};


export default function AdminUserDetailPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [user, setUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            const fetchUser = async () => {
                setIsLoading(true);
                try {
                    const fetchedUser = await getUserById(userId);
                    if (fetchedUser) {
                        setUser(fetchedUser);
                    } else {
                        setUser(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                    setUser(null);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchUser();
        }
    }, [userId]);

    if (isLoading) {
        return (
             <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Loading User Profile...</p>
            </div>
        )
    }

    if (!user) {
         return (
            <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <h2 className="mt-4 text-xl font-semibold">User Not Found</h2>
                <p className="mt-2 text-muted-foreground">
                    The user with this ID could not be found.
                </p>
                <Button variant="outline" onClick={() => router.back()} className="mt-6">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
                </Button>
            </div>
        )
    }


    return (
        <div className="space-y-6">
            <div>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
                </Button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
                <Card>
                    <CardHeader className="items-center text-center p-6">
                        <Avatar className="h-24 w-24 border-2 border-primary/50 mb-4">
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User Avatar'} data-ai-hint="person face" />
                            <AvatarFallback className="text-3xl bg-muted">{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-2xl font-semibold">{user.displayName}</h2>
                        <p className="text-sm text-muted-foreground truncate w-full px-2">{user.id}</p>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3 px-6 pb-6">
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground"/>
                            <span className="text-muted-foreground truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground"/>
                            <span className="text-muted-foreground">Joined {format(new Date(user.createdAt), 'MMMM d, yyyy')}</span>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl"><CreditCard /> Subscription</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Current Tier</span>
                                <Badge variant={user.subscription.tier === 'Pro' ? 'default' : 'secondary'} 
                                    className={cn(user.subscription.tier === 'Pro' && 'bg-green-600 hover:bg-green-700 text-white')}>
                                    {user.subscription.tier}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Status</span>
                                <span className="font-medium text-green-600">Active</span>
                            </div>
                            <Separator />
                            <Button disabled>Change Tier</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl"><BarChart2 /> Usage</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Content Items</span>
                                <span className="font-mono text-foreground font-medium">{user.contentCount}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Zones Created</span>
                                <span className="font-mono text-foreground font-medium">{user.zonesCreated}</span>
                            </div>
                             <Separator />
                             <Button variant="secondary" disabled>
                                <Eye className="mr-2 h-4 w-4" />
                                View User's Content
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
