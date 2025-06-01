
import type React from 'react';
import MatiLogo from '@/components/core/klipped-logo'; // Changed from KlippedLogo

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="mb-8">
        <MatiLogo iconSize={32} textSize="text-3xl" /> {/* Changed from KlippedLogo */}
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
