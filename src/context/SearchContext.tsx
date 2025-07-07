

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToContentItems } from '@/services/contentService';
import { performSearch } from '@/app/actions/searchActions';
import type { ContentItem, Tag, SearchFilters } from '@/types';
import type { Unsubscribe } from 'firebase/firestore';

interface SearchContextType {
  isInitialized: boolean;
  isLoading: boolean;
  searchResults: ContentItem[];
  availableTags: Tag[];
  availableContentTypes: string[];
  search: (query: string, filters: SearchFilters, options: { limit?: number; offset?: number; append?: boolean }) => Promise<void>;
  hasMore: boolean;
  totalHits: number;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const { user, role } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalHits, setTotalHits] = useState(0);

  useEffect(() => {
    if (!user || !role) return;

    let isMounted = true;
    let unsubscribe: Unsubscribe | null = null;
    
    // We still subscribe to content items to have a local copy for browsing
    // and for deriving available tags/types for filtering.
    const initialize = async () => {
      unsubscribe = subscribeToContentItems(user.uid, (items) => {
        if (!isMounted) return;
        setAllItems(items);
        if (!isInitialized) {
          setIsInitialized(true);
        }
      }, role.features.contentLimit);
    };

    initialize();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [user, role, isInitialized]);

  const search = useCallback(async (
    query: string, 
    filters: SearchFilters,
    options: { limit?: number; offset?: number; append?: boolean } = {}
  ) => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const { hits, total } = await performSearch(user.uid, query, filters, options.limit, options.offset);
      
      if (options.append) {
        setSearchResults(prev => [...prev, ...hits]);
      } else {
        setSearchResults(hits);
      }
      setTotalHits(total);
      setHasMore((options.offset || 0) + hits.length < total);

    } catch (e) {
      console.error("Search failed:", e);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  const availableTags = useMemo(() => {
    const tagsMap = new Map<string, Tag>();
    allItems.forEach(item => {
        (item.tags || []).forEach(tag => {
            if (!tagsMap.has(tag.name.toLowerCase())) {
                tagsMap.set(tag.name.toLowerCase(), tag);
            }
        });
    });
    return Array.from(tagsMap.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [allItems]);

  const availableContentTypes = useMemo(() => {
      const typesSet = new Set<string>();
      allItems.forEach(item => {
          if(item.contentType) typesSet.add(item.contentType);
      });
      return Array.from(typesSet).sort();
  }, [allItems]);

  const value = {
    isInitialized,
    isLoading,
    searchResults,
    availableTags,
    availableContentTypes,
    search,
    hasMore,
    totalHits,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
