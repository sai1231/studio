
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getShareData } from '@/services/shareService';
import { getContentItemById, getContentItems } from '@/services/contentService';
import type { Share, ContentItem } from '@/types';
import { Loader2, Link as LinkIcon, EyeOff, Lock, CalendarOff } from 'lucide-react';
import ContentCard from '@/components/core/link-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MatiLogo from '@/components/core/mati-logo';
import bcrypt from 'bcryptjs';
import { Card, CardContent } from '@/components/ui/card';

// Re-using components from the detail dialog for a consistent look
import { DialogVisuals } from '@/components/dialog/DialogVisuals';
import { DialogHeaderSection } from '@/components/dialog/DialogHeaderSection';
import { DialogDescription } from '@/components/dialog/DialogDescription';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';


const SharePage = () => {
  const params = useParams();
  const shareId = params.shareId as string;

  const [shareData, setShareData] = useState<Share | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPasswordIncorrect, setIsPasswordIncorrect] = useState(false);
  const [oembedHtml, setOembedHtml] = useState<string | null>(null);


  useEffect(() => {
    if (!shareId) return;

    const fetchShare = async () => {
      setIsLoading(true);
      try {
        const data = await getShareData(shareId);
        if (!data) {
          setError('This share link is either invalid or has expired.');
          return;
        }
        setShareData(data);
        if (!data.password) {
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error(e);
        setError('An error occurred while fetching this share link.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchShare();
  }, [shareId]);

  useEffect(() => {
    if (!shareData || !isAuthenticated) return;

    const fetchContent = async () => {
      setIsLoading(true);
      if (shareData.type === 'item' && shareData.contentId) {
        const item = await getContentItemById(shareData.contentId);
        setContent(item ? [item] : []);
      } else if (shareData.type === 'zone' && shareData.zoneId) {
        // Since this is a public page, we can't use a user-specific query
        // This part of the logic might need a backend Cloud Function to securely fetch zone content.
        // For now, we assume we can't fetch zone items without a user ID.
        setError("Sharing entire zones is not supported on this page yet.");
        setContent([]);
      }
      setIsLoading(false);
    };
    fetchContent();
  }, [shareData, isAuthenticated]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (shareData?.password) {
      const match = await bcrypt.compare(password, shareData.password);
      if (match) {
        setIsAuthenticated(true);
        setIsPasswordIncorrect(false);
      } else {
        setIsPasswordIncorrect(true);
      }
    }
  };
  
  const ErrorDisplay = ({ icon: Icon, title, message }: { icon: React.ElementType, title: string, message: string }) => (
      <div className="text-center">
          <Icon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-headline font-semibold">{title}</h1>
          <p className="text-muted-foreground mt-2">{message}</p>
      </div>
  );
  
  const SingleItemView = ({ item }: { item: ContentItem }) => {
    const hasVisual = item?.imageUrl || oembedHtml || (item?.contentType === 'PDF' && item?.url);
    return (
      <Card className={cn(
        "grid flex-grow overflow-hidden shadow-2xl rounded-2xl w-full max-w-6xl mx-auto h-[80vh] min-h-[600px]",
        hasVisual ? "md:grid-cols-2" : "md:grid-cols-1"
      )}>
        {item && hasVisual && <DialogVisuals item={item} onOembedLoad={setOembedHtml} />}

        <div className={cn(
          "flex flex-col bg-card text-card-foreground overflow-hidden relative",
          !hasVisual && "md:col-span-2"
        )}>
            <ScrollArea className="flex-grow">
              <div className="p-6 space-y-4">
                <DialogHeaderSection 
                    item={item} 
                    editableTitle={item.title}
                    onTitleChange={() => {}} // Read-only
                    onTitleBlur={() => {}}   // Read-only
                />
                {item.description && <DialogDescription description={item.description} />}
              </div>
            </ScrollArea>
        </div>
      </Card>
    )
  }


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading content...</p>
        </div>
      );
    }

    if (error) {
        const Icon = error.includes('expired') ? CalendarOff : EyeOff;
        return <ErrorDisplay icon={Icon} title="Link Not Available" message={error} />;
    }

    if (shareData && shareData.password && !isAuthenticated) {
      return (
        <div className="w-full max-w-sm mx-auto">
            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-center">
                <Lock className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-xl font-semibold">Password Protected</h2>
                <p className="text-muted-foreground">Please enter the password to view this content.</p>
                <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    autoFocus
                />
                {isPasswordIncorrect && <p className="text-sm text-destructive">Incorrect password. Please try again.</p>}
                <Button type="submit" className="w-full">Unlock</Button>
            </form>
        </div>
      );
    }
    
    if (content.length === 0) {
        return <ErrorDisplay icon={EyeOff} title="Content Not Found" message="The shared content could not be found." />;
    }
    
    // If it's a single item, use the new detailed view
    if (shareData?.type === 'item' && content[0]) {
      return <SingleItemView item={content[0]} />;
    }

    // Fallback for zone shares (multi-card view)
    return (
      <div className="space-y-6">
          <div className={'columns-1 md:columns-2 lg:columns-3 gap-4'}>
              {content.map(item => (
                <ContentCard 
                  key={item.id} 
                  item={item} 
                  onEdit={() => {}} 
                  onDelete={() => {}} 
                  isSelected={false}
                  onToggleSelection={() => {}}
                  isSelectionActive={false}
                />
              ))}
          </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground">
        <header className="p-4 border-b">
            <div className="container mx-auto flex justify-between items-center">
                <MatiLogo />
            </div>
        </header>
        <main className="container mx-auto py-8 px-4 flex-grow flex flex-col justify-center">
            {renderContent()}
        </main>
    </div>
  );
};

export default SharePage;
