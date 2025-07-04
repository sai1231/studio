
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getRolesWithFeatures,
  updateRoleFeatures,
  createDefaultRoles,
  createRole,
  deleteAndReassignRole,
  getUsersByRoleId,
  type Role,
  type AdminUser,
  type PlanFeatures,
} from '@/services/adminService';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, AlertTriangle, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { cn } from '@/lib/utils';


export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editableFeatures, setEditableFeatures] = useState<PlanFeatures | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [affectedUsers, setAffectedUsers] = useState<AdminUser[]>([]);
  const [isCheckingUsers, setIsCheckingUsers] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reassignments, setReassignments] = useState<Map<string, string | null>>(new Map());
  const [bulkAssignRoleId, setBulkAssignRoleId] = useState<string>('remove');
  
  const selectedRole = roles.find(r => r.id === selectedRoleId);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedRoles = await getRolesWithFeatures();
      setRoles(fetchedRoles);
      if (fetchedRoles.length > 0) {
        if (!selectedRoleId || !fetchedRoles.find(r => r.id === selectedRoleId)) {
          setSelectedRoleId(fetchedRoles[0].id);
        }
      } else {
        setSelectedRoleId(null);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({ title: 'Error', description: 'Could not fetch roles.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, selectedRoleId]);

  useEffect(() => {
    fetchRoles();
  }, []); // Only on initial mount

  useEffect(() => {
    if (selectedRole) {
      setEditableFeatures(selectedRole.features);
    } else {
      setEditableFeatures(null);
    }
  }, [selectedRole]);


  const handleCreateDefaultRoles = async () => {
    setIsCreatingDefaults(true);
    try {
      await createDefaultRoles();
      toast({ title: 'Default Roles Checked/Created', description: 'The "free_user" and "pro_user" roles are available.' });
      await fetchRoles();
    } catch (error) {
       console.error('Error creating default roles:', error);
       toast({ title: 'Creation Failed', description: 'Could not create default roles.', variant: 'destructive' });
    } finally {
        setIsCreatingDefaults(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast({ title: "Error", description: "Role name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
        await createRole(newRoleName.trim());
        toast({ title: "Role Created", description: `The role "${newRoleName.trim()}" has been created with default features.` });
        setNewRoleName("");
        await fetchRoles();
    } catch (error) {
        toast({ title: "Creation Failed", description: "Could not create the new role.", variant: "destructive" });
    } finally {
        setIsCreating(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!selectedRole) return;
    setRoleToDelete(selectedRole);
    setIsCheckingUsers(true); 
    setIsAlertOpen(true);
    try {
        const users = await getUsersByRoleId(selectedRole.id);
        setAffectedUsers(users);
        const initialReassignments = new Map<string, string | null>();
        users.forEach(user => initialReassignments.set(user.id, null));
        setReassignments(initialReassignments);
        setBulkAssignRoleId('remove');
    } catch (error) {
        toast({ title: "Error", description: "Could not check for users with this role.", variant: "destructive" });
        setIsAlertOpen(false);
    } finally {
        setIsCheckingUsers(false);
    }
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
        await deleteAndReassignRole(roleToDelete.id, reassignments);
        toast({ title: "Role Deleted", description: `The role "${roleToDelete.name}" has been successfully deleted.` });
        setSelectedRoleId(null); // Reset selection
        await fetchRoles();
    } catch (error) {
        toast({ title: "Deletion Failed", description: "Could not delete the role.", variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setIsAlertOpen(false);
        setRoleToDelete(null);
        setAffectedUsers([]);
        setReassignments(new Map());
    }
  };
  
  const handleFeatureChange = (key: keyof PlanFeatures, value: string | number | boolean) => {
    if (!editableFeatures) return;
    setEditableFeatures(prev => prev ? ({ ...prev, [key]: value }) : null);
  };
  
  const handleSaveChanges = async () => {
    if (!selectedRole || !editableFeatures) return;
    setIsSaving(true);
    try {
        await updateRoleFeatures(selectedRole.id, editableFeatures);
        toast({ title: 'Role Updated', description: `The "${selectedRole.name}" role has been successfully updated.` });
        await fetchRoles();
    } catch (error) {
        toast({ title: 'Update Failed', description: `Could not update the "${selectedRole.name}" role.`, variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  const otherRoles = roleToDelete ? roles.filter(r => r.id !== roleToDelete.id) : [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Role Configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center">
        <h1 className="text-2xl font-headline font-semibold text-foreground">
          Role & Feature Management
        </h1>
      </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plus /> Create New Role</CardTitle>
                <CardDescription>Define a new role for your users (e.g., moderator, contributor).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input id="role-name" placeholder="e.g., Moderator" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} disabled={isCreating} />
                </div>
                <Button onClick={handleCreateRole} disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Role
                </Button>
            </CardContent>
        </Card>

      {roles.length === 0 ? (
        <Card className="max-w-lg mx-auto text-center">
          <CardHeader>
             <div className="mx-auto bg-muted/50 rounded-full p-3 w-fit"><AlertTriangle className="h-10 w-10 text-amber-500" /></div>
            <CardTitle className="mt-4">No Roles Found</CardTitle>
            <CardDescription>Your Firestore database has no roles defined. You can create the default "free_user" and "pro_user" roles to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateDefaultRoles} disabled={isCreatingDefaults}>
              {isCreatingDefaults ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create Default Roles
            </Button>
          </CardContent>
        </Card>
      ) : (
         <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Edit Role</CardTitle>
                <CardDescription>Select a role from the dropdown to configure its features. Use -1 for unlimited.</CardDescription>
                <div className="flex items-center gap-2 pt-2">
                    <Select value={selectedRoleId || ''} onValueChange={setSelectedRoleId}>
                        <SelectTrigger className="flex-grow">
                            <SelectValue placeholder="Select a role to edit..." />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Button variant="ghost" size="icon" onClick={handleDeleteClick} disabled={!selectedRole}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            </CardHeader>
            {selectedRole && editableFeatures ? (
                <>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {Object.entries(editableFeatures).map(([key, value]) => (
                        <div key={key} className="space-y-2">
                            <Label htmlFor={`${selectedRole.id}-${key}`} className="capitalize font-medium">
                            {key.replace(/([A-Z])/g, ' $1')}
                            </Label>
                            {typeof value === 'boolean' ? (
                            <div className="flex items-center space-x-2">
                                <Switch
                                id={`${selectedRole.id}-${key}`}
                                checked={value}
                                onCheckedChange={(checked) => handleFeatureChange(key as keyof PlanFeatures, checked)}
                                />
                                <span className="text-sm text-muted-foreground">{value ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            ) : (
                            <Input
                                id={`${selectedRole.id}-${key}`}
                                type="number"
                                value={value}
                                onChange={(e) => handleFeatureChange(key as keyof PlanFeatures, e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter value..."
                            />
                            )}
                        </div>
                        ))}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveChanges} disabled={isSaving} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Changes
                        </Button>
                    </CardFooter>
                </>
            ) : (
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">Please select a role to begin editing.</p>
                </CardContent>
            )}
        </Card>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="max-w-xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete "{roleToDelete?.name}"?</AlertDialogTitle>
                {isCheckingUsers ? (
                    <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-3">Checking for assigned users...</span></div>
                ) : affectedUsers.length > 0 ? (
                    <div className="space-y-4">
                        <AlertDialogDescription>This role is assigned to {affectedUsers.length} user(s). You must reassign them to another role.</AlertDialogDescription>
                        <div className="space-y-2">
                             <Label>Bulk assign all users to:</Label>
                             <Select value={bulkAssignRoleId} onValueChange={(newRoleId) => {
                                setBulkAssignRoleId(newRoleId);
                                const newReassignments = new Map<string, string | null>();
                                const roleValue = newRoleId === 'remove' ? null : newRoleId;
                                affectedUsers.forEach(user => newReassignments.set(user.id, roleValue));
                                setReassignments(newReassignments);
                             }}>
                                <SelectTrigger><SelectValue placeholder="Choose an action..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="remove">No Role</SelectItem>
                                    {otherRoles.map(role => (<SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 rounded-md border max-h-48 overflow-y-auto p-3">
                            {affectedUsers.map(user => (
                                <div key={user.id} className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground">{user.displayName || user.email}</span>
                                    <Select value={reassignments.get(user.id) || 'remove'} onValueChange={(newRoleId) => {
                                        const newMap = new Map(reassignments);
                                        newMap.set(user.id, newRoleId === 'remove' ? null : newRoleId);
                                        setReassignments(newMap);
                                    }}>
                                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select new role" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="remove">No Role</SelectItem>
                                            {otherRoles.map(role => (<SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                     <AlertDialogDescription>This role is not assigned to any users. This action cannot be undone.</AlertDialogDescription>
                )}
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} disabled={isCheckingUsers || isDeleting} className="bg-destructive hover:bg-destructive/90">
                     {(isCheckingUsers || isDeleting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Role
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </div>
  );
}
