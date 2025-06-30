
'use client';

import { useState, useEffect } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/context/AuthContext';
import { app } from '@/lib/firebase';

const storage = getStorage(app);

// A cache to store fetched URLs and prevent re-fetching for the same path
const urlCache = new Map<string, string>();

export const useStorageUrl = (path?: string | null) => {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset state when path changes
    setUrl(null);
    setIsLoading(false);
    setError(null);

    if (!path || !user) {
      return;
    }

    // Return cached URL if available
    if (urlCache.has(path)) {
      setUrl(urlCache.get(path)!);
      return;
    }

    let isCancelled = false;
    const fetchUrl = async () => {
      setIsLoading(true);
      try {
        const storageRef = ref(storage, path);
        const downloadUrl = await getDownloadURL(storageRef);

        if (!isCancelled) {
          urlCache.set(path, downloadUrl); // Cache the new URL
          setUrl(downloadUrl);
        }
      } catch (e: any) {
        if (!isCancelled) {
          console.error(`Failed to get download URL for path: ${path}`, e);
          setError(e);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchUrl();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isCancelled = true;
    };
  }, [path, user]);

  return { url, isLoading, error };
};
