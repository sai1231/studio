
import type React from 'react';

// This layout is a pass-through to avoid double-nesting the admin shell.
// The actual admin layout with auth checks and the main shell is in /src/app/(admin)/admin/layout.tsx
export default function AdminGroupPassthroughLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
