
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, CalendarDays, User, Loader2, Edit3, ImageUp, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, updatePassword } from 'firebase/auth';

export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState(''); // This would need to be stored in Firestore, not on the auth object.
  const [isSaving, setIsSaving] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);


  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      // Bio is not a standard Firebase Auth field.
      // We'll keep the mock text and functionality for now.
      // A full implementation would fetch this from a 'users' collection in Firestore.
      setBio('Digital enthusiast, avid reader, and professional content clipper. Always on the lookout for the next big idea or fascinating article to save and share. Exploring the web one clip at a time!');
    }
  }, [user]);

  const handleSaveChanges = async () => {
    if (!user) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive'});
      return;
    }
    setIsSaving(true);
    try {
      // Update Firebase Auth display name
      await updateProfile(user, { displayName: displayName });
      
      // Here you would typically save other profile data (like the bio) to Firestore
      // e.g., await updateUserProfileInFirestore(user.uid, { bio });
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved.',
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: 'Error',
        description: 'Could not update your profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in.', variant: 'destructive'});
      return;
    }
    if (!newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'Please fill out both password fields.', variant: 'destructive'});
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters long.', variant: 'destructive'});
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive'});
      return;
    }

    setIsPasswordSaving(true);
    try {
      await updatePassword(user, newPassword);
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully changed.',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Error updating password:", error);
      let description = 'Could not update your password. Please try again.';
      if (error.code === 'auth/requires-recent-login') {
        description = 'This operation is sensitive and requires recent authentication. Please log out and sign back in to change your password.';
      }
      toast({
        title: 'Error',
        description: description,
        variant: 'destructive'
      });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleAvatarChange = () => {
    toast({
        title: "Feature Coming Soon",
        description: "Avatar uploading will be implemented in a future update.",
    });
  }

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) return name.split(' ').map(n => n[0]).join('');
    if (email) return email.charAt(0).toUpperCase();
    return 'U';
  };

  if (!user) {
    // The layout already handles redirection, this is a fallback.
    return null; 
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-3xl font-headline font-semibold text-foreground mb-8">My Profile</h1>
      
      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex items-center space-x-6">
            <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                    <AvatarImage src={user.photoURL || undefined} alt={displayName} data-ai-hint="user avatar large" />
                    <AvatarFallback className="text-3xl">
                      {getInitials(displayName, user.email)}
                    </AvatarFallback>
                </Avatar>
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleAvatarChange}
                    title="Change Avatar"
                >
                    <ImageUp className="h-4 w-4" />
                </Button>
            </div>
            <div>
              <CardTitle className="text-3xl font-headline text-foreground">{displayName || user.email}</CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-1">{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium flex items-center">
                <User className="h-5 w-5 mr-2 text-primary" />
                Display Name
            </Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="text-base focus-visible:ring-accent"
              placeholder="Your display name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-base font-medium flex items-center">
                <Edit3 className="h-5 w-5 mr-2 text-primary" />
                Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a little about yourself..."
              className="min-h-[100px] text-base focus-visible:ring-accent"
            />
            <p className="text-xs text-muted-foreground">Bio saving is not yet implemented.</p>
          </div>
          
          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-6 w-6 text-primary shrink-0" />
                <div>
                    <p className="font-medium text-foreground">Email Address</p>
                    <p className="text-muted-foreground">{user.email} (Cannot be changed)</p>
                </div>
            </div>
            {user.metadata.creationTime && (
              <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <CalendarDays className="h-6 w-6 text-primary shrink-0" />
                  <div>
                      <p className="font-medium text-foreground">Joined Mäti</p>
                      <p className="text-muted-foreground">{format(new Date(user.metadata.creationTime), 'MMMM d, yyyy')}</p>
                  </div>
              </div>
            )}
          </div>

        </CardContent>
        <CardFooter className="border-t p-6">
          <Button onClick={handleSaveChanges} disabled={isSaving} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-xl overflow-hidden mt-8">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <Lock className="h-5 w-5 mr-2 text-primary" />
            Security
          </CardTitle>
          <CardDescription>
            Change your password here.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isPasswordSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isPasswordSaving}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t p-6">
          <Button onClick={handleChangePassword} disabled={isPasswordSaving} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            {isPasswordSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing Password...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
