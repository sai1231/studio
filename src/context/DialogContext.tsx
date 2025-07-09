

'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { ContentItem } from '@/types';

interface DialogContextType {
  isAddContentDialogOpen: boolean;
  setIsAddContentDialogOpen: (open: boolean) => void;
  isAddTodoDialogOpen: boolean;
  setIsAddTodoDialogOpen: (open: boolean) => void;
  isRecordVoiceDialogOpen: boolean;
  setIsRecordVoiceDialogOpen: (open: boolean) => void;
  
  // New state management for Focus Mode
  isFocusModeOpen: boolean;
  focusModeItem: ContentItem | null; // Null for new, item for editing
  openFocusMode: (item?: ContentItem | null) => void;
  closeFocusMode: () => void;

  newlyAddedItem: ContentItem | null;
  setNewlyAddedItem: (item: ContentItem | null) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [isAddTodoDialogOpen, setIsAddTodoDialogOpen] = useState(false);
  const [isRecordVoiceDialogOpen, setIsRecordVoiceDialogOpen] = useState(false);
  
  // State for Focus Mode
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [focusModeItem, setFocusModeItem] = useState<ContentItem | null>(null);
  
  const [newlyAddedItem, setNewlyAddedItem] = useState<ContentItem | null>(null);

  const openFocusMode = (item: ContentItem | null = null) => {
    if (isAddContentDialogOpen) setIsAddContentDialogOpen(false);
    setFocusModeItem(item);
    setIsFocusModeOpen(true);
  };

  const closeFocusMode = () => {
    setIsFocusModeOpen(false);
    setFocusModeItem(null); // Reset item on close
  };


  return (
    <DialogContext.Provider value={{ 
        isAddContentDialogOpen, 
        setIsAddContentDialogOpen, 
        isAddTodoDialogOpen, 
        setIsAddTodoDialogOpen, 
        isRecordVoiceDialogOpen, 
        setIsRecordVoiceDialogOpen,
        isFocusModeOpen,
        focusModeItem,
        openFocusMode,
        closeFocusMode,
        newlyAddedItem,
        setNewlyAddedItem,
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
