import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Klipped',
  description: 'Log in to your Klipped account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
