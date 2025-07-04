
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

// FIX: Removed the `tag` property from the index definition to prevent config errors.
const createNewIndex = () => new Document<SearchableDocument, true>({
    document: {
      id: 'id',
      index: ['title', 'description', 'tags', 'domain'],
      store: true, // Store the full document for easier filtering and retrieval
    },
    tokenize: 'forward',
    cache: 100,
});

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const { user, role } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  
  const searchIndexRef = useRef<Document<SearchableDocument, true>>(createNewIndex());

  useEffect(() => {
    if (!user || !role) return;

    let isMounted = true;
    let unsubscribe: Unsubscribe | null = null;
    
    const contentLimit = role.features.contentLimit;

    const initialize = async () => {
      deleteExpiredContent(user.uid).catch(err => {
        console.error("Background cleanup of expired items failed:", err);
      });

      const cachedItems = await get<ContentItem[]>(CONTENT_CACHE_KEY);
      if (isMounted && cachedItems) {
        const limitedItems = contentLimit !== -1 ? cachedItems.slice(0, contentLimit) : cachedItems;
        setAllItems(limitedItems);
        const index = searchIndexRef.current;
        for (const item of limitedItems) {
          index.add(formatForIndex(item));
        }
        setIsInitialized(true);
      }

      unsubscribe = subscribeToContentItems(user.uid, (items) => {
        if (!isMounted) return;
        setAllItems(items);
        
        const newIndex = createNewIndex();
        for (const item of items) {
            newIndex.add(formatForIndex(item));
        }
        searchIndexRef.current = newIndex;

        set(CONTENT_CACHE_KEY, items); // Cache the full list, limit on read
        if (!isInitialized) {
          setIsInitialized(true);
        }
      }, contentLimit);
    };

    initialize();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [user, role, isInitialized]);

  const formatForIndex = (item: ContentItem): SearchableDocument => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    tags: item.tags.map(t => t.name),
    domain: item.domain || '',
    contentType: item.contentType || '',
    zoneId: item.zoneId || '',
  });

  // FIX: Reworked the search logic to use the `where` clause for filtering and handle results correctly.
  const search = useCallback((query: string, filters: SearchFilters) => {
    if (!searchIndexRef.current || !isInitialized) return;
    setIsLoading(true);

    const index = searchIndexRef.current;
    
    const whereClause = (doc: SearchableDocument) => {
      if (filters.zoneId && doc.zoneId !== filters.zoneId) return false;
      if (filters.contentType && doc.contentType !== filters.contentType) return false;
      return true;
    };

    const searchResults = index.search(query, {
      enrich: true,
      where: whereClause
    });
    
    const idSet = new Set<string>();
    
    if (query) {
        searchResults.forEach(fieldResult => {
          fieldResult.result.forEach((doc: {id: string, doc: SearchableDocument}) => {
            idSet.add(doc.id);
          });
        });
    } else {
        // If no query, search returns empty. We filter all items manually.
        allItems.forEach(item => {
            const searchableItem = formatForIndex(item);
            if (whereClause(searchableItem)) {
                idSet.add(item.id);
            }
        });
    }

    let finalItems = allItems.filter(item => idSet.has(item.id));
    
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
