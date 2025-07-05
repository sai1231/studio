import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Sign In - Mäti',
  description: 'Sign in to the Mäti Admin Portal.',
};

export default function LoginPage() {
  return <LoginForm />;
}
