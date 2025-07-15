

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import type { ContentItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


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
  const oembedHtmlRef = useRef<string | null>(null);

  useEffect(() => {
    setImageError(false);
    onOembedLoad(null);
    oembedHtmlRef.current = null;

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
            oembedHtmlRef.current = data.html;
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
    if (oembedHtmlRef.current && oembedContainerRef.current) {
      if (oembedHtmlRef.current.includes('twitter-tweet') && window.twttr) {
        window.twttr.widgets.load(oembedContainerRef.current);
        return;
      }
      if (oembedHtmlRef.current.includes('instagram-media') && window.instgrm) {
        window.instgrm.Embeds.process();
        return;
      }

      const scripts = Array.from(oembedContainerRef.current.querySelectorAll('script'));
      scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          newScript.src = oldScript.src;
          newScript.async = false;
          document.body.appendChild(newScript);
      });
    }
  }, [oembedHtmlRef.current]);

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    toast({
      title: "Color Copied!",
      description: `${color} has been copied to your clipboard.`,
    });
  };

  const hasVisual = !imageError && (item.imageUrl || oembedHtmlRef.current || (item.contentType === 'PDF' && item.url));

  if (!hasVisual && !isFetchingOembed) {
    return null;
  }

  return (
    <div className="hidden md:flex flex-col bg-muted/50">
      <div className="relative w-full flex-grow min-h-0 flex justify-center items-center rounded-lg overflow-hidden p-6">
        {isFetchingOembed ? (
          <div className="w-full aspect-video flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : oembedHtmlRef.current ? (
          <div ref={oembedContainerRef} className="oembed-container w-full" dangerouslySetInnerHTML={{ __html: oembedHtmlRef.current }} />
        ) : item.imageUrl && !imageError ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <img src={item.imageUrl} alt={item.title || 'Content Image'} data-ai-hint={item.title || "image"} className="w-full h-auto object-contain max-h-[70vh] rounded-md shadow-lg" loading="lazy" onError={() => setImageError(true)}/>
            {item.colorPalette && item.colorPalette.length > 0 && (
                <div className="flex w-full mt-4 rounded-md overflow-hidden shadow-md">
                  <TooltipProvider>
                    {item.colorPalette.map((color, index) => (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                           <button
                              onClick={() => handleCopyColor(color.hex)}
                              style={{ backgroundColor: color.hex }}
                              className="h-8 flex-grow transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
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
        ) : (item.type === 'link' && item.contentType === 'PDF' && item.url) ? (
          <iframe src={item.url} className="w-full h-full min-h-[70vh] rounded-xl border-0" title={item.title || 'PDF Preview'}></iframe>
        ) : null}
      </div>
    </div>
  );
};
