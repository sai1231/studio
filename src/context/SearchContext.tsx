
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import Document from 'flexsearch/dist/module/document.js';
import { set, get } from 'idb-keyval';
import { useAuth } from './AuthContext';
import { subscribeToContentItems, deleteExpiredContent } from '@/services/contentService';
import type { ContentItem, Tag, SearchFilters } from '@/types';
import type { Unsubscribe } from 'firebase/firestore';

const CONTENT_CACHE_KEY = 'content-cache';

interface SearchContextType {
  isInitialized: boolean;
  isLoading: boolean;
  searchResults: ContentItem[];
  availableTags: Tag[];
  availableContentTypes: string[];
  search: (query: string, filters: SearchFilters) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

interface SearchableDocument {
  id: string;
  title: string;
  description: string;
  tags: string[];
  domain: string;
  contentType: string;
  zoneId: string;
}

const createNewIndex = () => new Document<SearchableDocument, true>({
    document: {
      id: 'id',
      index: ['title', 'description', 'tags', 'domain'],
      store: ['id', 'title', 'description', 'tags', 'domain', 'contentType', 'zoneId'],
      // We will tag fields for filtering
      tag: ['zoneId', 'contentType'],
    },
    tokenize: 'forward',
    cache: 100,
});

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  
  const searchIndexRef = useRef<Document<SearchableDocument, true>>(createNewIndex());

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let unsubscribe: Unsubscribe | null = null;

    const initialize = async () => {
      // Run cleanup for expired items in the background.
      deleteExpiredContent(user.uid).catch(err => {
        console.error("Background cleanup of expired items failed:", err);
      });

      // Load from cache first
      const cachedItems = await get<ContentItem[]>(CONTENT_CACHE_KEY);
      if (isMounted && cachedItems) {
        setAllItems(cachedItems);
        const index = searchIndexRef.current;
        for (const item of cachedItems) {
          index.add(formatForIndex(item));
        }
        setIsInitialized(true);
      }

      // Then subscribe for real-time updates
      unsubscribe = subscribeToContentItems(user.uid, (items) => {
        if (!isMounted) return;
        setAllItems(items);
        
        // Re-create the index and populate it
        const newIndex = createNewIndex();
        for (const item of items) {
            newIndex.add(formatForIndex(item));
        }
        searchIndexRef.current = newIndex;

        set(CONTENT_CACHE_KEY, items); // Update cache
        if (!isInitialized) {
          setIsInitialized(true);
        }
      });
    };

    initialize();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [user, isInitialized]);

  const formatForIndex = (item: ContentItem): SearchableDocument => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    tags: item.tags.map(t => t.name),
    domain: item.domain || '',
    contentType: item.contentType || '',
    zoneId: item.zoneId || '',
  });

  const search = useCallback((query: string, filters: SearchFilters) => {
    if (!searchIndexRef.current || !isInitialized) return;
    setIsLoading(true);

    const index = searchIndexRef.current;
    
    // Build the where clause for filtering
    const whereClause: { [key: string]: string } = {};
    if (filters.zoneId) whereClause.zoneId = filters.zoneId;
    if (filters.contentType) whereClause.contentType = filters.contentType;

    const searchOptions: any = {
      index: ['title', 'description', 'tags', 'domain'],
      enrich: true,
      tag: [], // Use tag for filtering
    };
    
    if (filters.zoneId) searchOptions.tag.push(`zoneId:${filters.zoneId}`);
    if (filters.contentType) searchOptions.tag.push(`contentType:${filters.contentType}`);
    
    const searchResults = query ? index.search(query, searchOptions) : index.search(searchOptions);
   
    let finalItems: ContentItem[] = [];
    if(searchResults.length > 0) {
      const idSet = new Set<string>();
      searchResults[0].result.forEach((doc: SearchableDocument) => idSet.add(doc.id));
      finalItems = allItems.filter(item => idSet.has(item.id));
    } else if (!query) {
      finalItems = allItems;
    }
    
    if (filters.tagNames && filters.tagNames.length > 0) {
        finalItems = finalItems.filter(item => {
            const itemTagNames = item.tags.map(t => t.name.toLowerCase());
            return filters.tagNames!.every(t => itemTagNames.includes(t.toLowerCase()));
        });
    }

    setSearchResults(finalItems);
    setIsLoading(false);
  }, [isInitialized, allItems]);
  
  const availableTags = useMemo(() => {
    const tagsMap = new Map<string, Tag>();
    allItems.forEach(item => {
        item.tags.forEach(tag => {
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
