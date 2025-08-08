
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Download, Eye, Mic } from 'lucide-react';
import type { ContentItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PdfIcon from '../core/PdfIcon';
import { Button } from '../ui/button';


interface DialogVisualsProps {
  item: ContentItem;
  onOembedLoad: (html: string | null) => void;
}

declare global {
  interface Window {
    twttr?: { widgets: { load: (element?: HTMLElement) => void; }; };
    instgrm?: { Embeds: { process: () => void; }; };
  }
}

export const DialogVisuals: React.FC<DialogVisualsProps> = ({ item, onOembedLoad }) => {
  const { toast } = useToast();
  const [isFetchingOembed, setIsFetchingOembed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const oembedContainerRef = useRef<HTMLDivElement>(null);
  const [oembedHtml, setOembedHtml] = useState<string | null>(null);

  useEffect(() => {
    setImageError(false);
    onOembedLoad(null);
    setOembedHtml(null);

    if (item.type === 'link' && item.url && item.contentType !== 'PDF') {
      setIsFetchingOembed(true);
      fetch(`/api/oembed?url=${encodeURIComponent(item.url)}`)
        .then(res => {
            if (!res.ok) {
                return Promise.reject(res);
            }
            return res.json();
        })
        .then(data => {
          if (data.html) {
            setOembedHtml(data.html);
            onOembedLoad(data.html);
          }
        })
        .catch(async (error) => {
            if (error instanceof Response) {
                const errorBody = await error.text();
                console.warn(`Could not fetch oEmbed data. Status: ${error.status}. Body: ${errorBody}`);
            } else {
                console.error("Failed to fetch oEmbed data with a non-response error", error);
            }
        })
        .finally(() => setIsFetchingOembed(false));
    }
  }, [item.id, item.type, item.url, item.contentType, onOembedLoad]);

  useEffect(() => {
    if (oembedHtml && oembedContainerRef.current) {
        if (oembedHtml.includes('instagram-media') && window.instgrm) {
            window.instgrm.Embeds.process();
        } else if (oembedHtml.includes('twitter-tweet') && window.twttr) {
            window.twttr.widgets.load(oembedContainerRef.current);
        } else {
            const scripts = Array.from(oembedContainerRef.current.querySelectorAll('script'));
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.src = oldScript.src;
                newScript.async = false;
                document.body.appendChild(newScript);
            });
        }
    }
  }, [oembedHtml]);


  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    toast({
      title: "Color Copied!",
      description: `${color} has been copied to your clipboard.`,
    });
  };

  const hasVisual = !imageError && (item.imageUrl || oembedHtml || (item.contentType === 'PDF' && item.url) || item.audioUrl);

  if (!hasVisual && !isFetchingOembed) {
    return null;
  }
  
  // Create a URL for viewing that strips the download token
  const viewImageUrl = item.imageUrl?.split('&token=')[0];

  return (
    <div className="md:flex flex-col bg-muted/50 hidden">
      <div className="relative w-full flex-grow min-h-0 flex justify-center items-center rounded-lg overflow-hidden p-6">
        {isFetchingOembed ? (
          <div className="w-full aspect-video flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : oembedHtml ? (
          <div ref={oembedContainerRef} className="oembed-container w-full" dangerouslySetInnerHTML={{ __html: oembedHtml }} />
        ) : item.imageUrl && !imageError ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                <img src={item.imageUrl} alt={item.title || 'Content Image'} data-ai-hint={item.title || "image"} className="w-full h-auto object-contain max-h-[60vh] rounded-md shadow-lg" loading="lazy" onError={() => setImageError(true)}/>
                
                <div className="flex items-center gap-4">
                  <Button asChild>
                      <a href={item.imageUrl} download>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                      </a>
                  </Button>
                  <Button asChild variant="secondary">
                      <a href={viewImageUrl} target="_blank" rel="noopener noreferrer">
                          <Eye className="mr-2 h-4 w-4" />
                          View Image
                      </a>
                  </Button>
                </div>

                {item.colorPalette && item.colorPalette.length > 0 && (
                    <div className="flex w-full justify-center mt-4 gap-2">
                    <TooltipProvider>
                        {item.colorPalette.map((color, index) => (
                        <Tooltip key={index}>
                            <TooltipTrigger asChild>
                            <button
                                onClick={() => handleCopyColor(color.hex)}
                                style={{ backgroundColor: color.hex }}
                                className="h-8 w-8 rounded-full border-2 border-background/50 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
                                aria-label={`Copy color ${color.name} (${color.hex})`}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>Copy {color.hex}</p>
                            </TooltipContent>
                        </Tooltip>
                        ))}
                    </TooltipProvider>
                    </div>
                )}
            </div>
        ) : item.type === 'voice' && item.audioUrl ? (
            <div className="flex flex-col items-center justify-center w-full space-y-4">
                <Mic className="h-16 w-16 text-primary/80" />
                <audio controls src={item.audioUrl} className="w-full rounded-lg" />
            </div>
        ) : (item.type === 'link' && item.contentType === 'PDF' && item.url) ? (
            <div className="flex flex-col items-center justify-center text-center">
                <PdfIcon className="h-24 w-24 mb-6 text-primary/80" />
                <div className="flex items-center gap-4">
                  <Button asChild>
                      <a href={item.url} download target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                      </a>
                  </Button>
                   <Button asChild variant="secondary">
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <Eye className="mr-2 h-4 w-4" />
                            View PDF
                        </a>
                    </Button>
                </div>
            </div>
        ) : null}
      </div>
    </div>
  );
};
