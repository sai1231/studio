
'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Trash2, FolderSymlink, Tag, Pencil } from 'lucide-react';
import type { Zone } from '@/types';
import { useToast } from '@/hooks/use-toast';
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

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  availableZones: Zone[];
  onMoveToZone: (zoneId: string | null) => void;
  onDelete: () => void;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  availableZones,
  onMoveToZone,
  onDelete,
}) => {
  const { toast } = useToast();

  const handleActionPlaceholder = (actionName: string) => {
    toast({
      title: 'Coming Soon',
      description: `${actionName} functionality will be implemented in a future update.`,
    });
  };

  return (
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
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>Actions</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-56">
                                <DropdownMenuItem onSelect={() => handleActionPlaceholder('Add Tags')}>
                                    <Tag className="mr-2 h-4 w-4" />
                                    <span>Add Tags...</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleActionPlaceholder('Add Mind Note')}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    <span>Add Mind Note...</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {availableZones.map(zone => (
                                    <DropdownMenuItem key={zone.id} onSelect={() => onMoveToZone(zone.id)}>
                                        <FolderSymlink className="mr-2 h-4 w-4" />
                                        <span>Move to {zone.name}</span>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem onSelect={() => onMoveToZone(null)}>
                                    <FolderSymlink className="mr-2 h-4 w-4" />
                                    <span>Move to Home (No Zone)</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Move to a zone, add tags, or add a mind note.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

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
  );
};

export default BulkActionBar;
