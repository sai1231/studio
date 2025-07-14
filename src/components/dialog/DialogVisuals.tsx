

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
  const oembedHtml = useRef<string | null>(null);

  useEffect(() => {
    setImageError(false);
    onOembedLoad(null);
    oembedHtml.current = null;

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
            oembedHtml.current = data.html;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  useEffect(() => {
    if (oembedHtml.current && oembedContainerRef.current) {
      if (oembedHtml.current.includes('twitter-tweet') && window.twttr) {
        window.twttr.widgets.load(oembedContainerRef.current);
        return;
      }
      if (oembedHtml.current.includes('instagram-media') && window.instgrm) {
        window.instgrm.Embeds.process();
        return;
      }

      if (oembedHtml.current.includes('wp-embedded-content') && oembedHtml.current.includes('wp-embed-js')) {
        const scripts = Array.from(oembedContainerRef.current.querySelectorAll('script'));
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            newScript.src = oldScript.src;
            newScript.async = false;
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
  }, [oembedHtml.current]);

  const hasVisual = !imageError && (item.imageUrl || oembedHtml.current || (item.contentType === 'PDF' && item.url));

  if (!hasVisual && !isFetchingOembed) {
    return null;
  }

  return (
    <div className="hidden md:flex flex-col bg-muted/50">
      <div className="relative w-full flex-grow min-h-0 flex justify-center items-center rounded-lg overflow-hidden">
        {isFetchingOembed ? (
          <div className="w-full aspect-video flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : oembedHtml.current ? (
          <div ref={oembedContainerRef} className="oembed-container w-full" dangerouslySetInnerHTML={{ __html: oembedHtml.current }} />
        ) : item.imageUrl && !imageError ? (
          <img src={item.imageUrl} alt={item.title || 'Content Image'} data-ai-hint={item.title || "image"} className="w-full h-full object-contain" loading="lazy" onError={() => setImageError(true)}/>
        ) : (item.type === 'link' && item.contentType === 'PDF' && item.url) ? (
          <iframe src={item.url} className="w-full h-full min-h-[70vh] rounded-xl border-0" title={item.title || 'PDF Preview'}></iframe>
        ) : null}
      </div>
    </div>
  );
};
