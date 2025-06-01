
import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Mati', // Changed Klipped to Mati
  description: 'Log in to your Mati account.', // Changed Klipped to Mati
};

export default function LoginPage() {
  return <LoginForm />;
}
