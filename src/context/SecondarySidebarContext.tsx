'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface SecondarySidebarContextType {
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;
  panelContent: React.ReactNode;
  setPanelContent: (content: React.ReactNode) => void;
}

const SecondarySidebarContext = createContext<SecondarySidebarContextType | undefined>(undefined);

export const SecondarySidebarProvider = ({ children }: { children: ReactNode }) => {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [panelContent, setPanelContent] = useState<React.ReactNode>(null);

  const value = { activePanel, setActivePanel, panelContent, setPanelContent };

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
