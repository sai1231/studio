import { SignupForm } from '@/components/auth/signup-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - Klipped',
  description: 'Create a new Klipped account.',
};

export default function SignupPage() {
  return <SignupForm />;
}
