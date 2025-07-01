
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import Document from 'flexsearch/dist/module/document.js';
import { set, get, del } from 'idb-keyval';
import { useAuth } from './AuthContext';
import { subscribeToContentItems } from '@/services/contentService';
import type { ContentItem, Tag, SearchFilters } from '@/types';
import type { Unsubscribe } from 'firebase/firestore';

const CONTENT_CACHE_KEY = 'content-cache';
const CACHE_TIMESTAMP_KEY = 'content-cache-timestamp';

interface SearchContextType {
  isInitialized: boolean;
  isLoading: boolean;
  searchResults: ContentItem[];
  availableTags: Tag[];
  availableContentTypes: string[];
  search: (query: string, filters: SearchFilters) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Define the shape of our document for FlexSearch
interface SearchableDocument {
  id: string;
  title: string;
  description: string;
  tags: string[];
  domain: string;
  contentType: string;
  zoneId: string;
}

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  
  const [searchIndex, setSearchIndex] = useState<Document<SearchableDocument, true> | null>(null);

  useEffect(() => {
    // Initialize FlexSearch Document
    const index = new Document<SearchableDocument, true>({
      document: {
        id: 'id',
        index: ['title', 'description', 'tags', 'domain', 'contentType'],
        store: true, // Store the document so we can retrieve full items
      },
      tokenize: 'forward',
      cache: 100,
    });
    setSearchIndex(index);
  }, []);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const initialize = async () => {
      if (!user || !searchIndex) return;

      setIsInitialized(false);
      
      // Try to load from IndexedDB first
      const cachedItems = await get<ContentItem[]>(CONTENT_CACHE_KEY);
      if (cachedItems) {
        setAllItems(cachedItems);
        for (const item of cachedItems) {
          searchIndex.add(formatForIndex(item));
        }
        setIsInitialized(true);
      }

      // Set up real-time listener
      unsubscribe = subscribeToContentItems(user.uid, (items) => {
        setAllItems(items);
        // Full re-index on every update for simplicity and consistency
        searchIndex.clear();
        for (const item of items) {
          searchIndex.add(formatForIndex(item));
        }
        set(CONTENT_CACHE_KEY, items); // Update cache
        if (!isInitialized) {
          setIsInitialized(true);
        }
      });
    };

    initialize();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, searchIndex, isInitialized]);

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
    if (!searchIndex || !isInitialized) return;
    setIsLoading(true);

    const whereClauses: Record<string, string> = {};
    if (filters.zoneId) whereClauses.zoneId = filters.zoneId;
    if (filters.contentType) whereClauses.contentType = filters.contentType;
    if (filters.tagNames && filters.tagNames.length > 0) {
        whereClauses.tags = filters.tagNames[0]; // FlexSearch `where` only supports one value for array field
    }

    const results = searchIndex.search(query, {
      index: ['title', 'description'],
      where: whereClauses,
      bool: "and",
      enrich: true,
    });

    let finalItems: ContentItem[] = [];

    if (results.length > 0) {
      // Flatten results from multiple fields
      const idSet = new Set<string>();
      results.forEach(fieldResult => {
        fieldResult.result.forEach((doc: SearchableDocument) => {
          idSet.add(doc.id);
        });
      });
      finalItems = allItems.filter(item => idSet.has(item.id));
    }
    
    // Additional client-side filtering for multiple tags if necessary
    if (filters.tagNames && filters.tagNames.length > 1) {
        const remainingTags = filters.tagNames.slice(1);
        finalItems = finalItems.filter(item => {
            const itemTagNames = item.tags.map(t => t.name);
            return remainingTags.every(t => itemTagNames.includes(t));
        });
    }

    setSearchResults(finalItems);
    setIsLoading(false);
  }, [searchIndex, isInitialized, allItems]);
  
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
