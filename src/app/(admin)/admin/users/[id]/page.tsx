
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CreditCard, BarChart2, Mail, Calendar, Eye, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getUserById, getRolesWithFeatures, updateUserRole, type AdminUser, type Role } from "@/services/adminService";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";


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
    const { toast } = useToast();

    const [user, setUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [roles, setRoles] = useState<Role[]>([]);
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);


    const fetchUserAndRoles = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const [fetchedUser, fetchedRoles] = await Promise.all([
                getUserById(userId),
                getRolesWithFeatures()
            ]);
            
            if (fetchedUser) {
                setUser(fetchedUser);
                setSelectedRoleId(fetchedUser.role?.id || null);
            } else {
                setUser(null);
            }
            setRoles(fetchedRoles);
        } catch (error) {
            console.error("Failed to fetch user or roles:", error);
            setUser(null);
            toast({ title: "Error", description: "Failed to load user data or roles.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [userId, toast]);

    useEffect(() => {
        fetchUserAndRoles();
    }, [fetchUserAndRoles]);
    
    const handleRoleChange = async () => {
        if (!user) return;
        setIsUpdatingRole(true);
        try {
            await updateUserRole(user.id, selectedRoleId);
            const roleName = roles.find(r => r.id === selectedRoleId)?.name || "No Role";
            toast({
                title: 'Role Updated',
                description: `${user.displayName || 'User'}'s role is now ${roleName}.`,
            });
            await fetchUserAndRoles();
            setIsRoleDialogOpen(false);
        } catch (error) {
            console.error("Failed to update role:", error);
            toast({
                title: 'Update Failed',
                description: 'Could not update the user role. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsUpdatingRole(false);
        }
    };


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
                <p className="text-muted-foreground">
                    The user with this ID could not be found.
                </p>
                <Button variant="outline" onClick={() => router.back()} className="mt-6">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
                </Button>
            </div>
        )
    }

    const currentRoleName = user.role?.name || "No Role";

    return (
        <div className="space-y-6">
            <div>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
                </Button>
            </div>
            
            <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
                <div className="space-y-6">
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
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl"><ShieldCheck /> Role & Permissions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Current Role</span>
                                <Badge 
                                    variant={user.role ? 'default' : 'secondary'} 
                                    className={cn(user.role?.name.toLowerCase().includes('pro') && 'bg-green-600 hover:bg-green-700 text-white')}>
                                    {currentRoleName}
                                </Badge>
                            </div>
                            <Separator />
                            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>Change Role</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Change Role</DialogTitle>
                                        <DialogDescription>
                                            Select a new role for {user.displayName}. This will change their feature access.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <Label htmlFor="role-select" className="mb-2 block">New Role</Label>
                                        <Select value={selectedRoleId || ''} onValueChange={(value) => setSelectedRoleId(value === 'none' ? null : value)}>
                                            <SelectTrigger id="role-select">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Role</SelectItem>
                                                {roles.map(role => (
                                                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline" disabled={isUpdatingRole}>Cancel</Button>
                                        </DialogClose>
                                        <Button onClick={handleRoleChange} disabled={isUpdatingRole}>
                                            {isUpdatingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Save Role
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
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
