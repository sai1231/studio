
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" {...props}>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.11-5.52c-2.17 1.45-4.92 2.3-8.78 2.3-6.76 0-12.47-4.55-14.51-10.61H2.26v5.7C6.22 42.66 14.48 48 24 48z"/>
      <path fill="#FBBC05" d="M9.49 29.08c-.43-1.3-.66-2.67-.66-4.08s.23-2.78.66-4.08v-5.7H2.26C.88 18.25 0 21.05 0 24s.88 5.75 2.26 8.66l7.23-5.58z"/>
      <path fill="#EA4335" d="M24 9.4c3.54 0 6.66 1.21 9.13 3.62l6.29-6.29C35.91 2.5 30.48 0 24 0 14.48 0 6.22 5.34 2.26 13.22l7.23 5.7c2.04-6.06 7.75-10.62 14.51-10.62z"/>
  </svg>
);

const formSchema = z.object({
  displayName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  terms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and privacy policy.",
  }),
});

export function SignupForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const provider = new GoogleAuthProvider();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      terms: false,
    },
  });

  async function handleEmailSignUp(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    if (!auth) {
      toast({
        title: 'Configuration Error',
        description: 'Firebase is not configured. Please add your credentials to the .env file.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(userCredential.user, { displayName: values.displayName });
      toast({
        title: 'Account Created',
        description: 'Welcome to Mäti! You are now logged in.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Email Sign-Up error:", error);
      toast({
        title: 'Sign-Up Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    if (!auth) {
      toast({
        title: 'Configuration Error',
        description: 'Firebase is not configured. Please add your credentials to the .env file.',
        variant: 'destructive',
      });
      setIsGoogleLoading(false);
      return;
    }
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: 'Sign-Up Successful',
        description: 'Welcome to Mäti! You are now logged in.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      let errorMessage = 'An unknown error occurred during sign-up.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-up window was closed. Please try again.';
      } else {
        errorMessage = error.message;
      }
      toast({
        title: 'Sign-Up Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Create your Mäti Account</CardTitle>
        <CardDescription>Enter your details below or sign up with Google.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleEmailSignUp)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      I agree to the{' '}
                      <Link href="/terms" target="_blank" className="underline hover:text-primary">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" target="_blank" className="underline hover:text-primary">
                        Privacy Policy
                      </Link>
                      .
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
          </form>
        </Form>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button onClick={handleGoogleSignIn} variant="outline" className="w-full" disabled={isLoading || isGoogleLoading}>
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-5 w-5" />
          )}
          Sign Up with Google
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
            </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
