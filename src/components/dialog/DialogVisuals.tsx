

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import type { ContentItem } from '@/types';

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
  const [isFetchingOembed, setIsFetchingOembed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const oembedContainerRef = useRef<HTMLDivElement>(null);
  
  // Use a ref to prevent re-fetching on minor state changes.
  // The effect will now only re-run if item.id changes.
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
                // It's common for oEmbed to fail with 404, so we'll log it as a warning.
                console.warn(`Could not fetch oEmbed data. Status: ${error.status}. Body: ${errorBody}`);
            } else {
                console.error("Failed to fetch oEmbed data with a non-response error", error);
            }
        })
        .finally(() => setIsFetchingOembed(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]); // Only re-run when the item ID changes

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
          // Important: Append to body to ensure script executes in the global scope
          document.body.appendChild(newScript);
      });
    }
  }, [oembedHtmlRef.current]);

  const hasVisual = !imageError && (item.imageUrl || oembedHtmlRef.current || (item.contentType === 'PDF' && item.url));

  if (!hasVisual && !isFetchingOembed) {
    return null;
  }

  return (
    <div className="hidden md:flex flex-col bg-muted/50">
      <div className="relative w-full flex-grow min-h-0 flex justify-center items-center rounded-lg overflow-hidden">
        {isFetchingOembed ? (
          <div className="w-full aspect-video flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : oembedHtmlRef.current ? (
          <div ref={oembedContainerRef} className="oembed-container w-full" dangerouslySetInnerHTML={{ __html: oembedHtmlRef.current }} />
        ) : item.imageUrl && !imageError ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <img src={item.imageUrl} alt={item.title || 'Content Image'} data-ai-hint={item.title || "image"} className="w-full h-auto object-contain" loading="lazy" onError={() => setImageError(true)}/>
            {item.colorPalette && item.colorPalette.length > 0 && (
                <div className="flex w-full mt-auto">
                    {item.colorPalette.map((color, index) => (
                        <div key={index} style={{ backgroundColor: color }} className="h-4 flex-grow" title={color} />
                    ))}
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
