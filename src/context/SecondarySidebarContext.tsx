
'use client';

import React, { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';

// This context is no longer in use after reverting to the hover-card navigation pattern.
// It is kept in the project to avoid breaking potential future references but is not actively used.

interface SecondarySidebarContextType {
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;
  panelData: { content: React.ReactNode; label: string } | null;
  setPanelData: (data: { content: React.ReactNode; label: string } | null) => void;
}

const SecondarySidebarContext = createContext<SecondarySidebarContextType | undefined>(undefined);

export const SecondarySidebarProvider = ({ children }: { children: ReactNode }) => {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<{ content: React.ReactNode; label: string } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setActivePanel(null);
  }, [pathname]);


  const value = { activePanel, setActivePanel, panelData, setPanelData };

  return (
    <SecondarySidebarContext.Provider value={value}>
      {children}
    </SecondarySidebarContext.Provider>
  );
};

export const useSecondarySidebar = () => {
  const context = useContext(SecondarySidebarContext);
  if (context === undefined) {
    throw new Error('useSecondarySidebar must be used within a SecondarySidebarProvider');
  }
  return context;
};
