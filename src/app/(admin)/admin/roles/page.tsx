
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
import { getAdminRoles, createAdminRole, deleteAdminRole, getUsersByRoleId, type AdminRole, type AdminUser } from "@/services/adminService";
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

export default function AdminRolesPage() {
    const [roles, setRoles] = useState<AdminRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();
    
    // State for the delete confirmation dialog
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<AdminRole | null>(null);
    const [affectedUsers, setAffectedUsers] = useState<AdminUser[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);


    const fetchRoles = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedRoles = await getAdminRoles();
            setRoles(fetchedRoles);
        } catch (error) {
            console.error("Failed to fetch roles:", error);
            toast({ title: "Error", description: "Could not fetch admin roles.", variant: "destructive" });
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
            await createAdminRole(newRoleName.trim());
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
    
    const handleDeleteClick = async (role: AdminRole) => {
        setRoleToDelete(role);
        setIsDeleting(true); // Show loader while we fetch users
        setIsAlertOpen(true);
        try {
            const users = await getUsersByRoleId(role.id);
            setAffectedUsers(users);
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
            await deleteAdminRole(roleToDelete.id);
            toast({ title: "Role Deleted", description: `The role "${roleToDelete.name}" has been deleted.` });
            await fetchRoles();
        } catch (error) {
            console.error("Failed to delete role:", error);
            toast({ title: "Deletion Failed", description: "Could not delete the role.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setIsAlertOpen(false);
            setRoleToDelete(null);
            setAffectedUsers([]);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Plus /> Create New Role</CardTitle>
                    <CardDescription>
                        Define a new administrative role for your application users.
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
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete "{roleToDelete?.name}"?</AlertDialogTitle>
                        {isDeleting && !affectedUsers.length ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span className="ml-3">Checking for assigned users...</span>
                            </div>
                        ) : affectedUsers.length > 0 ? (
                            <AlertDialogDescription>
                                This role is currently assigned to the following {affectedUsers.length} user(s). Deleting it will remove their role assignment. This action cannot be undone.
                                <ul className="mt-3 list-disc list-inside bg-muted/50 p-3 rounded-md max-h-40 overflow-y-auto">
                                    {affectedUsers.map(user => (
                                        <li key={user.id} className="text-sm text-foreground">{user.displayName || user.email}</li>
                                    ))}
                                </ul>
                            </AlertDialogDescription>
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
