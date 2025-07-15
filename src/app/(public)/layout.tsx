
// This is a new file for public-facing layouts like the share page.
// It will not include any of the main app's authenticated components (e.g., sidebars, headers).
'use client';

import type React from 'react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // This layout is minimal by design to provide a clean slate for public pages.
  return <>{children}</>;
}
