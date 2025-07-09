

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
  isFocusModeDialogOpen: boolean;
  setIsFocusModeDialogOpen: (open: boolean) => void;
  newlyAddedItem: ContentItem | null;
  setNewlyAddedItem: (item: ContentItem | null) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [isAddContentDialogOpen, setIsAddContentDialogOpen] = useState(false);
  const [isAddTodoDialogOpen, setIsAddTodoDialogOpen] = useState(false);
  const [isRecordVoiceDialogOpen, setIsRecordVoiceDialogOpen] = useState(false);
  const [isFocusModeDialogOpen, setIsFocusModeDialogOpen] = useState(false);
  const [newlyAddedItem, setNewlyAddedItem] = useState<ContentItem | null>(null);

  return (
    <DialogContext.Provider value={{ 
        isAddContentDialogOpen, 
        setIsAddContentDialogOpen, 
        isAddTodoDialogOpen, 
        setIsAddTodoDialogOpen, 
        isRecordVoiceDialogOpen, 
        setIsRecordVoiceDialogOpen,
        isFocusModeDialogOpen,
        setIsFocusModeDialogOpen,
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
