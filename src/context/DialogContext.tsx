
'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface DialogContextType {
  isAddContentDialogOpen: boolean;
  setIsAddContentDialogOpen: (open: boolean) => void;
  isAddTodoDialogOpen: boolean;
  setIsAddTodoDialogOpen: (open: boolean) => void;
  isRecordVoiceDialogOpen: boolean;
  setIsRecordVoiceDialogOpen: (open: boolean) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [isAddTodoDialogOpen, setIsAddTodoDialogOpen] = useState(false);
  const [isRecordVoiceDialogOpen, setIsRecordVoiceDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <DialogContext.Provider value={{ 
        isAddContentDialogOpen, 
        setIsAddContentDialogOpen, 
        isAddTodoDialogOpen, 
        setIsAddTodoDialogOpen, 
        isRecordVoiceDialogOpen, 
        setIsRecordVoiceDialogOpen,
        refreshKey,
        triggerRefresh,
    }}>
      {children}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
