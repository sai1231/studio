
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import type { ContentItem } from '@/types';

interface DialogVisualsProps {
  item: ContentItem;
}

declare global {
  interface Window {
    twttr?: { widgets: { load: (element?: HTMLElement) => void; }; };
    instgrm?: { Embeds: { process: () => void; }; };
  }
}

export const DialogVisuals: React.FC<DialogVisualsProps> = ({ item }) => {
  const [oembedHtml, setOembedHtml] = useState<string | null>(null);
  const [isFetchingOembed, setIsFetchingOembed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const oembedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImageError(false);
    setOembedHtml(null);

    if (item.type === 'link' && item.url && item.contentType !== 'PDF') {
      setIsFetchingOembed(true);
      fetch(`/api/oembed?url=${encodeURIComponent(item.url)}`)
        .then(res => {
            if (!res.ok) {
                // If the response is not ok, we reject the promise with the response object
                // so we can inspect its body in the catch block.
                return Promise.reject(res);
            }
            return res.json();
        })
        .then(data => {
          if (data.html) setOembedHtml(data.html);
        })
        .catch(async (error) => {
            // Check if the caught error is a Response object
            if (error instanceof Response) {
                const errorBody = await error.text();
                // It's not a critical error if oEmbed isn't found, so use warn instead.
                console.warn(`Could not fetch oEmbed data. Status: ${error.status}. Body: ${errorBody}`);
            } else {
                console.error("Failed to fetch oEmbed data with a non-response error", error);
            }
        })
        .finally(() => setIsFetchingOembed(false));
    }
  }, [item]);

  useEffect(() => {
    if (oembedHtml && oembedContainerRef.current) {
      if (oembedHtml.includes('twitter-tweet') && window.twttr) {
        window.twttr.widgets.load(oembedContainerRef.current);
        return;
      }
      if (oembedHtml.includes('instagram-media') && window.instgrm) {
        window.instgrm.Embeds.process();
        return;
      }

      if (oembedHtml.includes('wp-embedded-content') && oembedHtml.includes('wp-embed-js')) {
        const scripts = Array.from(oembedContainerRef.current.querySelectorAll('script'));
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            newScript.src = oldScript.src;
            newScript.async = false; // Important for some embed scripts
            document.body.appendChild(newScript);
        });
        return;
      }

      const container = oembedContainerRef.current;
      const scripts = Array.from(container.getElementsByTagName('script'));
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }
  }, [oembedHtml]);

  const hasVisual = !imageError && (item.imageUrl || oembedHtml || (item.contentType === 'PDF' && item.url));

  if (!hasVisual) {
    return null;
  }

  return (
    <div className="hidden md:flex flex-col bg-muted/50">
      <div className="relative w-full flex-grow min-h-0 flex justify-center items-center rounded-lg overflow-hidden">
        {isFetchingOembed ? (
          <div className="w-full aspect-video flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : oembedHtml ? (
          <div ref={oembedContainerRef} className="oembed-container w-full" dangerouslySetInnerHTML={{ __html: oembedHtml }} />
        ) : item.imageUrl && !imageError ? (
          <img src={item.imageUrl} alt={item.title || 'Content Image'} data-ai-hint={item.title || "image"} className="w-full h-full object-contain" loading="lazy" onError={() => setImageError(true)}/>
        ) : (item.type === 'link' && item.contentType === 'PDF' && item.url) ? (
          <iframe src={item.url} className="w-full h-full min-h-[70vh] rounded-xl border-0" title={item.title || 'PDF Preview'}></iframe>
        ) : null}
      </div>
    </div>
  );
};
