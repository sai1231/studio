'use client';

import { Search as SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DeprecatedSearchPage() {
  const router = useRouter();
  return (
    <div className="container mx-auto py-8 text-center flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
      <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
      <h1 className="text-2xl font-headline font-semibold">This Page is No Longer Used</h1>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto">
        Search is now integrated directly into your dashboard. Please use the search bar in the header to find your content.
      </p>
      <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
        Go to Dashboard
      </Button>
    </div>
  );
}
