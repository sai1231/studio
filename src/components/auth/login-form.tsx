
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { app } from '@/lib/firebase';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" {...props}>
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.11-5.52c-2.17 1.45-4.92 2.3-8.78 2.3-6.76 0-12.47-4.55-14.51-10.61H2.26v5.7C6.22 42.66 14.48 48 24 48z"/>
        <path fill="#FBBC05" d="M9.49 29.08c-.43-1.3-.66-2.67-.66-4.08s.23-2.78.66-4.08v-5.7H2.26C.88 18.25 0 21.05 0 24s.88 5.75 2.26 8.66l7.23-5.58z"/>
        <path fill="#EA4335" d="M24 9.4c3.54 0 6.66 1.21 9.13 3.62l6.29-6.29C35.91 2.5 30.48 0 24 0 14.48 0 6.22 5.34 2.26 13.22l7.23 5.7c2.04-6.06 7.75-10.62 14.51-10.62z"/>
    </svg>
);

export function LoginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  async function handleGoogleSignIn() {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: 'Login Successful',
        description: 'Welcome to Mati!',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      let errorMessage = 'An unknown error occurred during sign-in.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in window was closed. Please try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with the same email address but different sign-in credentials.';
      } else {
        errorMessage = error.message;
      }
      toast({
        title: 'Sign-In Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Welcome to Mati</CardTitle>
        <CardDescription>Sign in with your Google account to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGoogleSignIn} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
             <GoogleIcon className="mr-2 h-5 w-5" />
          )}
          Sign In with Google
        </Button>
      </CardContent>
    </Card>
  );
}
