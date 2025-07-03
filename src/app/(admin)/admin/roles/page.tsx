
'use client';
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRoles, createRole, deleteAndReassignRole, getUsersByRoleId, type Role, type AdminUser } from "@/services/adminService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminRolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();
    
    // State for the delete confirmation dialog
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
    const [affectedUsers, setAffectedUsers] = useState<AdminUser[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [reassignments, setReassignments] = useState<Map<string, string | null>>(new Map());
    const [bulkAssignRoleId, setBulkAssignRoleId] = useState<string>('remove');

    const fetchRoles = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedRoles = await getRoles();
            setRoles(fetchedRoles);
        } catch (error) {
            console.error("Failed to fetch roles:", error);
            toast({ title: "Error", description: "Could not fetch roles.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) {
            toast({ title: "Error", description: "Role name cannot be empty.", variant: "destructive" });
            return;
        }
        setIsCreating(true);
        try {
            await createRole(newRoleName.trim());
            toast({ title: "Role Created", description: `The role "${newRoleName.trim()}" has been created.` });
            setNewRoleName("");
            await fetchRoles(); // Refresh the list
        } catch (error) {
            console.error("Failed to create role:", error);
            toast({ title: "Creation Failed", description: "Could not create the new role.", variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleDeleteClick = async (role: Role) => {
        setRoleToDelete(role);
        setIsDeleting(true); 
        setIsAlertOpen(true);
        try {
            const users = await getUsersByRoleId(role.id);
            setAffectedUsers(users);
            
            // Initialize reassignments, defaulting to removing the role for each user
            const initialReassignments = new Map<string, string | null>();
            users.forEach(user => initialReassignments.set(user.id, null));
            setReassignments(initialReassignments);
            setBulkAssignRoleId('remove'); // Set bulk dropdown default
        } catch (error) {
            toast({ title: "Error", description: "Could not check for users with this role.", variant: "destructive" });
            setIsAlertOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const confirmDelete = async () => {
        if (!roleToDelete) return;
        setIsDeleting(true);
        try {
            await deleteAndReassignRole(roleToDelete.id, reassignments);
            toast({ title: "Role Deleted", description: `The role "${roleToDelete.name}" has been successfully deleted and users have been reassigned.` });
            await fetchRoles();
        } catch (error) {
            console.error("Failed to delete role:", error);
            toast({ title: "Deletion Failed", description: "Could not delete the role.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setIsAlertOpen(false);
            setRoleToDelete(null);
            setAffectedUsers([]);
            setReassignments(new Map());
        }
    };

    const otherRoles = roleToDelete ? roles.filter(r => r.id !== roleToDelete.id) : [];

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Plus /> Create New Role</CardTitle>
                    <CardDescription>
                        Define a new role for your application users (e.g., admin, manager, pro_user).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="role-name">Role Name</Label>
                        <Input 
                            id="role-name" 
                            placeholder="e.g., Manager, Content Editor" 
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            disabled={isCreating}
                        />
                    </div>
                    <Button onClick={handleCreateRole} disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Role
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck /> Existing Roles</CardTitle>
                    <CardDescription>
                        List of all configurable roles in the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Role Name</TableHead>
                                <TableHead>Role ID</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <>
                                    <TableRow><TableCell colSpan={3}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                    <TableRow><TableCell colSpan={3}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                </>
                            ) : roles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                                        No roles created yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                roles.map(role => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium">{role.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{role.id}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(role)} title={`Delete ${role.name}`}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent className="max-w-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete "{roleToDelete?.name}"?</AlertDialogTitle>
                        {isDeleting && affectedUsers.length === 0 ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span className="ml-3">Checking for assigned users...</span>
                            </div>
                        ) : affectedUsers.length > 0 ? (
                            <div className="space-y-4">
                                <AlertDialogDescription>
                                    This role is assigned to {affectedUsers.length} user(s). You must reassign them or remove their role before deleting.
                                </AlertDialogDescription>
                                <div className="space-y-2">
                                     <Label>Bulk assign all users to:</Label>
                                     <Select
                                        value={bulkAssignRoleId}
                                        onValueChange={(newRoleId) => {
                                            setBulkAssignRoleId(newRoleId);
                                            const newReassignments = new Map<string, string | null>();
                                            const roleValue = newRoleId === 'remove' ? null : newRoleId;
                                            affectedUsers.forEach(user => {
                                                newReassignments.set(user.id, roleValue);
                                            });
                                            setReassignments(newReassignments);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose an action..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="remove">Remove Role Assignment</SelectItem>
                                            {otherRoles.map(role => (
                                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 rounded-md border max-h-48 overflow-y-auto p-3">
                                    {affectedUsers.map(user => (
                                        <div key={user.id} className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-foreground">{user.displayName || user.email}</span>
                                            <Select
                                                value={reassignments.get(user.id) || 'remove'}
                                                onValueChange={(newRoleId) => {
                                                    const newMap = new Map(reassignments);
                                                    newMap.set(user.id, newRoleId === 'remove' ? null : newRoleId);
                                                    setReassignments(newMap);
                                                }}
                                            >
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="Select new role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="remove">Remove Role</SelectItem>
                                                    {otherRoles.map(role => (
                                                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                             <AlertDialogDescription>
                                This role is not assigned to any users. This action cannot be undone.
                            </AlertDialogDescription>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                             {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Role
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
