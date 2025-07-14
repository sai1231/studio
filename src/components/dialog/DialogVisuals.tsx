
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
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => {
          if (data.html) setOembedHtml(data.html);
        })
        .catch(e => console.error("Failed to fetch oEmbed data", e))
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
