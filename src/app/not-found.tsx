
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SearchX } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md text-center shadow-2xl">
        <CardHeader>
            <div className="mx-auto bg-muted/50 rounded-full p-4 w-fit mb-4">
                <SearchX className="h-12 w-12 text-primary" />
            </div>
          <CardTitle className="text-4xl font-headline font-bold">404 - Not Found</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Oops! The page you're looking for seems to have gotten lost in the digital ether.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Don't worry, you can find your way back.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
