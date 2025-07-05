
import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Mäti',
  description: 'Sign in to your Mäti account using email and password or Google.',
};

export default function LoginPage() {
  return <LoginForm />;
}
