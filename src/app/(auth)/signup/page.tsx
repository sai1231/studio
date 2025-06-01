
import { SignupForm } from '@/components/auth/signup-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Mati', // Changed Klipped to Mati
  description: 'Create a new Mati account.', // Changed Klipped to Mati
};

export default function SignupPage() {
  return <SignupForm />;
}
