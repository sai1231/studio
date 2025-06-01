
'use client';

import type React from 'react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, CalendarDays, User, Loader2, Edit3, ImageUp } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  name: string;
  email: string;
  bio: string;
  avatarUrl: string;
  joinedDate: Date;
}

const mockUserProfile: UserProfile = {
  name: 'Samantha Bee',
  email: 'samantha@example.com',
  bio: 'Digital enthusiast, avid reader, and professional content clipper. Always on the lookout for the next big idea or fascinating article to save and share. Exploring the web one clip at a time!',
  avatarUrl: 'https://placehold.co/128x128.png',
  joinedDate: new Date(2023, 4, 15), // May 15, 2023
};

export default function ProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile>(mockUserProfile);
  const [editableName, setEditableName] = useState(mockUserProfile.name);
  const [editableBio, setEditableBio] = useState(mockUserProfile.bio);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setProfile(prev => ({ ...prev, name: editableName, bio: editableBio }));
    setIsSaving(false);
    toast({
      title: 'Profile Updated',
      description: 'Your profile information has been saved.',
    });
  };

  const handleAvatarChange = () => {
    toast({
        title: "Feature Coming Soon",
        description: "Avatar uploading will be implemented in a future update.",
    });
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-3xl font-headline font-semibold text-foreground mb-8">My Profile</h1>
      
      <Card className="shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/30 p-6">
          <div className="flex items-center space-x-6">
            <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                    <AvatarImage src={profile.avatarUrl} alt={profile.name} data-ai-hint="user avatar large" />
                    <AvatarFallback className="text-3xl">
                    {profile.name.split(' ').map(n => n[0]).join('')}
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
              <CardTitle className="text-3xl font-headline text-foreground">{profile.name}</CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-1">{profile.email}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium flex items-center">
                <User className="h-5 w-5 mr-2 text-primary" />
                Full Name
            </Label>
            <Input
              id="name"
              value={editableName}
              onChange={(e) => setEditableName(e.target.value)}
              className="text-base focus-visible:ring-accent"
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-base font-medium flex items-center">
                <Edit3 className="h-5 w-5 mr-2 text-primary" />
                Bio
            </Label>
            <Textarea
              id="bio"
              value={editableBio}
              onChange={(e) => setEditableBio(e.target.value)}
              placeholder="Tell us a little about yourself..."
              className="min-h-[100px] text-base focus-visible:ring-accent"
            />
          </div>
          
          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-6 w-6 text-primary shrink-0" />
                <div>
                    <p className="font-medium text-foreground">Email Address</p>
                    <p className="text-muted-foreground">{profile.email} (Cannot be changed)</p>
                </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <CalendarDays className="h-6 w-6 text-primary shrink-0" />
                <div>
                    <p className="font-medium text-foreground">Joined Klipped</p>
                    <p className="text-muted-foreground">{format(profile.joinedDate, 'MMMM d, yyyy')}</p>
                </div>
            </div>
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
    </div>
  );
}
