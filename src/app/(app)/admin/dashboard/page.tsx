'use client';

import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function AdminPageMoved() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center p-4">
      <ShieldAlert className="h-16 w-16 text-primary mb-4" />
      <h1 className="text-2xl font-bold">The Admin Portal has Moved</h1>
      <p className="mt-2 text-muted-foreground max-w-md">
        For improved security and performance, the admin portal is now a separate application.
      </p>
      <Button asChild className="mt-6">
        <a href="/admin" target="_blank" rel="noopener noreferrer">
          Open Admin Portal
        </a>
      </Button>
    </div>
  );
}
