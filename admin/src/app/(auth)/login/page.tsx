import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Sign In - Mati',
  description: 'Sign in to the Mati Admin Portal.',
};

export default function LoginPage() {
  return <LoginForm />;
}
