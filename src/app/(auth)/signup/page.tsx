
import { SignupForm } from '@/components/auth/signup-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Mati',
  description: 'Create a new Mati account using Google.',
};

export default function SignupPage() {
  return <SignupForm />;
}
