import { AdminLoginForm } from '@/components/auth/admin-login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Sign In - Mati',
  description: 'Sign in to the Mati Admin Portal.',
};

export default function AdminLoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-md">
         <AdminLoginForm />
      </div>
    </div>
  )
}
