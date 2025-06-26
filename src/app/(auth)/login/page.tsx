
import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Mati',
  description: 'Sign in to your Mati account using Google.',
};

export default function LoginPage() {
  return <LoginForm />;
}
