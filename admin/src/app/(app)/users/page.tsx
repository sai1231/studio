
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getUsersWithSubscription, type AdminUser } from '../../../services/adminService';
import { cn } from '@/lib/utils';

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
);

const getInitials = (name?: string | null) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
        return `${names[0][0]}${names[names.length-1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [planFilter, setPlanFilter] = useState('all'); // 'all', 'free', 'pro'

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const fetchedUsers = await getUsersWithSubscription();
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Failed to fetch users:", error);
                // In a real app, show a toast notification
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = searchTerm.trim() === '' ||
                user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesPlan = planFilter === 'all' ||
                user.subscription.tier.toLowerCase() === planFilter;

            return matchesSearch && matchesPlan;
        });
    }, [users, searchTerm, planFilter]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Search, view, and manage user accounts.</CardDescription>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search users by name or email..." 
                            className="pl-9" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Filter by plan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Plans</SelectItem>
                            <SelectItem value="free">Free Tier</SelectItem>
                            <SelectItem value="pro">Pro Tier</SelectItem>
                        </SelectContent>
                    </Select>
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
                        {isLoading ? (
                            <>
                                <UserRowSkeleton />
                                <UserRowSkeleton />
                                <UserRowSkeleton />
                                <UserRowSkeleton />
                                <UserRowSkeleton />
                            </>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User Avatar'} data-ai-hint="person face" />
                                                <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{user.displayName || 'N/A'}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.subscription.tier === 'Pro' ? 'default' : 'secondary'} 
                                            className={cn(user.subscription.tier === 'Pro' && 'bg-green-600 hover:bg-green-700 text-white')}>
                                            {user.subscription.tier}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.contentCount}
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(user.createdAt), 'yyyy-MM-dd')}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/users/${user.id}`}>Manage</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <p>No users found.</p>
                                    {searchTerm && <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
