
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check, Share2, Link as LinkIcon, Lock, CalendarClock } from 'lucide-react';
import { add } from 'date-fns';
import type { ContentItem } from '@/types';
import { createShareLink } from '@/services/shareService';
import { cn } from '@/lib/utils';

interface ShareDialogProps {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ item, open, onOpenChange }) => {
  const { toast } = useToast();
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiryOption, setExpiryOption] = useState('never');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setUsePassword(false);
      setPassword('');
      setExpiryOption('never');
      setGeneratedLink(null);
      setHasCopied(false);
    }
    onOpenChange(isOpen);
  };

  const handleGenerateLink = async () => {
    if (!item || !item.userId) return;

    setIsLoading(true);
    try {
      let expiresAt: Date | null = null;
      if (expiryOption !== 'never') {
        expiresAt = add(new Date(), { days: parseInt(expiryOption, 10) });
      }

      const shareData = {
        userId: item.userId,
        contentId: item.id,
        type: 'item' as const,
        expiresAt,
        password: usePassword ? password : undefined,
      };

      const newShare = await createShareLink(shareData);
      setGeneratedLink(`${window.location.origin}/share/${newShare.id}`);
      
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Could not create share link.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setHasCopied(true);
    toast({ title: 'Copied!', description: 'Share link copied to clipboard.' });
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 bg-card">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share "{item?.title}"
          </DialogTitle>
          <DialogDescription>
            Generate a secure link to share this item with others.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6">
          {generatedLink ? (
              <div className="py-4 space-y-4">
                  <p className="text-sm text-muted-foreground">Your secure link is ready. Copy and share it.</p>
                  <div className="flex items-center space-x-2">
                      <Input id="generated-link" value={generatedLink} readOnly />
                      <Button type="button" size="icon" onClick={handleCopyToClipboard}>
                          {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                  </div>
                   <Button variant="outline" onClick={() => setGeneratedLink(null)}>Create a different link</Button>
              </div>
          ) : (
            <div className="py-4 space-y-6">
              <div className="space-y-3">
                 <Label className="flex items-center gap-2 font-medium">
                    <Lock className="h-4 w-4" />
                    Password Protection
                </Label>
                <div className="flex items-center space-x-2">
                  <Switch id="use-password" checked={usePassword} onCheckedChange={setUsePassword} />
                  <Label htmlFor="use-password">{usePassword ? 'Enabled' : 'Disabled'}</Label>
                </div>
                {usePassword && (
                  <Input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    type="password"
                  />
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="expiration" className="flex items-center gap-2 font-medium">
                    <CalendarClock className="h-4 w-4" />
                    Link Expiration
                </Label>
                <Select value={expiryOption} onValueChange={setExpiryOption}>
                  <SelectTrigger id="expiration">
                    <SelectValue placeholder="Set an expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never Expires</SelectItem>
                    <SelectItem value="1">Expires in 1 Day</SelectItem>
                    <SelectItem value="7">Expires in 7 Days</SelectItem>
                    <SelectItem value="30">Expires in 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 mt-auto border-t bg-card rounded-b-lg">
          {!generatedLink ? (
            <Button onClick={handleGenerateLink} disabled={isLoading || (usePassword && !password)}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Link
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
