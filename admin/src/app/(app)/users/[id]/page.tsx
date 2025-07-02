'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, CreditCard, BarChart2, Mail, Calendar, Shield, Trash2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { Separator } from "@/components/ui/separator";

export default function AdminUserDetailPage() {
    const router = useRouter();
    return (
        <div className="space-y-6">
            <div>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
                </Button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader className="items-center text-center">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <Skeleton className="h-6 w-32 mt-4" />
                        <Skeleton className="h-4 w-40 mt-1" />
                    </CardHeader>
                    <CardContent className="text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground"/>
                            <Skeleton className="h-4 w-36" />
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <Calendar className="h-4 w-4 text-muted-foreground"/>
                            <Skeleton className="h-4 w-28" />
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CreditCard /> Subscription</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span>Current Tier</span>
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Status</span>
                                <Skeleton className="h-5 w-16" />
                            </div>
                            <Separator />
                            <Button disabled>Change Tier</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart2 /> Usage</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span>Content Items</span>
                                <Skeleton className="h-5 w-24" />
                            </div>
                             <div className="flex justify-between items-center">
                                <span>Zones Created</span>
                                <Skeleton className="h-5 w-24" />
                            </div>
                             <Button variant="secondary" disabled>
                                <Eye className="mr-2 h-4 w-4" />
                                View User's Content
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

             <Card>
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2"><Shield /> Admin Actions</CardTitle>
                    <CardDescription>Use these actions with caution. Changes are irreversible.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                   <Button variant="outline" disabled>Impersonate User</Button>
                   <Button variant="outline" disabled>Send Password Reset</Button>
                   <Button variant="destructive" disabled>
                       <Trash2 className="mr-2 h-4 w-4" />
                       Delete User
                   </Button>
                </CardContent>
             </Card>
        </div>
    )
}
