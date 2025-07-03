
'use client';
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAdminRoles, createAdminRole, type AdminRole } from "@/services/adminService";

export default function AdminRolesPage() {
    const [roles, setRoles] = useState<AdminRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { toast } = useToast();

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
            setNewRoleName('');
            await fetchRoles(); // Refresh the list
        } catch (error) {
            console.error("Failed to create role:", error);
            toast({ title: "Creation Failed", description: "Could not create the new role.", variant: "destructive" });
        } finally {
            setIsCreating(false);
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
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <>
                                    <TableRow><TableCell colSpan={2}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                    <TableRow><TableCell colSpan={2}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                                </>
                            ) : roles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                                        No roles created yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                roles.map(role => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium">{role.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{role.id}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
