'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const UserRowSkeleton = () => (
    <TableRow>
        <TableCell>
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
        </TableCell>
        <TableCell>
            <Skeleton className="h-6 w-16 rounded-full" />
        </TableCell>
        <TableCell>
            <Skeleton className="h-4 w-12" />
        </TableCell>
        <TableCell>
            <Skeleton className="h-4 w-20" />
        </TableCell>
        <TableCell>
            <Skeleton className="h-8 w-20 rounded-md" />
        </TableCell>
    </TableRow>
)

export default function AdminUsersPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Search, view, and manage user accounts.</CardDescription>
                <div className="relative pt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search users by name or email..." className="pl-9" />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Subscription</TableHead>
                            <TableHead>Content Count</TableHead>
                            <TableHead>Joined Date</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <UserRowSkeleton />
                        <UserRowSkeleton />
                        <UserRowSkeleton />
                        <UserRowSkeleton />
                        <UserRowSkeleton />
                        <TableRow>
                             <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold">JD</div>
                                    <div>
                                        <div className="font-medium">Jane Doe</div>
                                        <div className="text-sm text-muted-foreground">jane.doe@example.com</div>
                                    </div>
                                </div>
                            </TableCell>
                             <TableCell>
                               <div className="font-medium text-primary">Pro</div>
                            </TableCell>
                             <TableCell>
                                342
                            </TableCell>
                             <TableCell>
                                2023-05-15
                            </TableCell>
                             <TableCell>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href="/users/123">Manage</Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
