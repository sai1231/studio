

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToContentItems, subscribeToZones, getUniqueTagsFromItems, getUniqueContentTypesFromItems, getUniqueDomainsFromItems } from '@/services/contentService';
import { performSearch } from '@/app/actions/searchActions';
import type { ContentItem, Tag, SearchFilters, Zone } from '@/types';
import type { Unsubscribe } from 'firebase/firestore';

interface SearchContextType {
  isInitialized: boolean;
  isLoading: boolean;
  searchResults: ContentItem[];
  allItems: ContentItem[]; // Expose all items for client-side filtering
  availableZones: Zone[];
  availableTags: Tag[];
  availableContentTypes: string[];
  availableDomains: string[];
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
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalHits, setTotalHits] = useState(0);

  useEffect(() => {
    if (!user || !role) return;

    let isMounted = true;
    let contentUnsubscribe: Unsubscribe | null = null;
    let zonesUnsubscribe: Unsubscribe | null = null;
    
    const initialize = async () => {
      contentUnsubscribe = subscribeToContentItems(user.uid, (items) => {
        if (!isMounted) return;
        setAllItems(items);
        if (!isInitialized) {
          setIsInitialized(true);
        }
      }, role.features.contentLimit);

      zonesUnsubscribe = subscribeToZones(user.uid, (zones) => {
          if (!isMounted) return;
          setAvailableZones(zones);
      });
    };

    initialize();

    return () => {
      isMounted = false;
      contentUnsubscribe?.();
      zonesUnsubscribe?.();
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
      const searchFilters = { ...filters, isTrashed: filters.isTrashed || false };
      const { hits, total } = await performSearch(user.uid, query, searchFilters, options.limit, options.offset);
      
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
  
  const availableTags = useMemo(() => getUniqueTagsFromItems(allItems), [allItems]);
  const availableContentTypes = useMemo(() => getUniqueContentTypesFromItems(allItems), [allItems]);
  const availableDomains = useMemo(() => getUniqueDomainsFromItems(allItems), [allItems]);

  const value = {
    isInitialized,
    isLoading,
    searchResults,
    allItems, // Expose all items
    availableZones,
    availableTags,
    availableContentTypes,
    availableDomains,
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
