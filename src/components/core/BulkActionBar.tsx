
'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Trash2, CheckSquare, Wand2 } from 'lucide-react';
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
import { Separator } from '../ui/separator';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  availableZones: Zone[];
  onBulkEdit: (updates: {
    zoneId?: string | null;
    tagsToAdd?: string[];
    memoryNoteToAppend?: string;
    expiresAt?: string | null;
  }) => void;
  onDelete: () => void;
  onZoneCreate: (zoneName: string) => Promise<Zone | null>;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onSelectAll,
  availableZones,
  onBulkEdit,
  onDelete,
  onZoneCreate,
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-8 inset-x-0 flex justify-center z-40 pointer-events-none"
      >
        <div className="flex items-center gap-4 rounded-full bg-card p-3 shadow-2xl border pointer-events-auto">
          <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={onClearSelection}>
                  <X className="h-5 w-5" />
              </Button>
              <span className="font-medium text-foreground">{selectedCount} selected</span>
          </div>
          
          <Separator orientation="vertical" className="h-6" />

           <Button variant="link" onClick={onSelectAll} className="p-0 h-auto text-primary">
              <CheckSquare className="mr-2 h-4 w-4" />
              Select All
            </Button>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
              <Button onClick={() => setIsEditDialogOpen(true)}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Actions
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
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
        onZoneCreate={onZoneCreate}
      />
    </>
  );
};

export default BulkActionBar;
