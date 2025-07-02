import type React from 'react';

export default function DeprecatedAdminLayout({ children }: { children: React.ReactNode }) {
  // This layout is for the deprecated admin pages inside the main app.
  // It simply passes children through to avoid unnecessary layout rendering.
  return <>{children}</>;
}
