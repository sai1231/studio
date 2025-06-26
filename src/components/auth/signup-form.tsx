
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SignupForm() {
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Sign up with Google</CardTitle>
        <CardDescription>This application uses Google for authentication.</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          Please proceed to the login page to sign in with your Google account.
        </p>
        <Link href="/login" className="font-medium text-primary hover:underline mt-4 inline-block">
            Go to Login
        </Link>
      </CardContent>
    </Card>
  );
}
