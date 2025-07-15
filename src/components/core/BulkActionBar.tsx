
'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';
import type { Zone } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { BulkEditDialog } from './BulkEditDialog';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  availableZones: Zone[];
  onBulkEdit: (updates: {
    zoneId?: string | null;
    tagsToAdd?: string[];
    memoryNoteToAppend?: string;
    expiresAt?: string | null;
  }) => void;
  onDelete: () => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  availableZones,
  onBulkEdit,
  onDelete,
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
      >
        <div className="flex items-center gap-4 rounded-full bg-background p-3 shadow-2xl border">
          <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={onClearSelection}>
                  <X className="h-5 w-5" />
              </Button>
              <span className="font-medium text-foreground">{selectedCount} selected</span>
          </div>
          
          <div className="flex items-center gap-2">
              <Button onClick={() => setIsEditDialogOpen(true)}>
                  Actions
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the {selectedCount} selected item(s). This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
        </div>
      </motion.div>
      <BulkEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        availableZones={availableZones}
        onBulkEdit={onBulkEdit}
        selectedCount={selectedCount}
      />
    </>
  );
};

export default BulkActionBar;
