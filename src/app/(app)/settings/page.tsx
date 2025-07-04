
'use client';

import type React from 'react';
import { ThemeToggle } from '@/components/core/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { UserCog, Bell, Database, Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-3xl font-headline font-semibold text-foreground mb-8">Settings</h1>

      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Palette className="h-5 w-5 mr-2 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of your Mati experience. {/* Changed Klipped to Mati */}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-1 rounded-lg">
              <span className="text-sm font-medium text-foreground">
                Theme
              </span>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg opacity-70">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <UserCog className="h-5 w-5 mr-2 text-primary" />
              Account
            </CardTitle>
            <CardDescription>
              Manage your account details and preferences. (Placeholder)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Change Password</Label>
              <Button variant="outline" className="mt-1 w-full sm:w-auto" disabled>Coming Soon</Button>
            </div>
            <div>
              <Label className="text-sm font-medium">Export Your Data</Label>
              <Button variant="outline" className="mt-1 w-full sm:w-auto" disabled>Coming Soon</Button>
            </div>
             <div>
              <Label className="text-sm font-medium text-destructive">Delete Account</Label>
              <Button variant="destructive" className="mt-1 w-full sm:w-auto" disabled>Coming Soon</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg opacity-70">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Bell className="h-5 w-5 mr-2 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure your notification settings. (Placeholder)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Notification preferences will be available here.</p>
             <Button variant="outline" className="mt-2 w-full sm:w-auto" disabled>Configure Notifications</Button>
          </CardContent>
        </Card>

         <Card className="shadow-lg opacity-70">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Database className="h-5 w-5 mr-2 text-primary" />
              Data Management
            </CardTitle>
            <CardDescription>
              Manage your application data. (Placeholder)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Data import/export options will be available here.</p>
            <Button variant="outline" className="mt-2 w-full sm:w-auto" disabled>Manage Data</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Added Label for context, though it's a simple component
const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <p className={`block text-sm font-medium text-foreground ${className || ''}`}>{children}</p>
);
