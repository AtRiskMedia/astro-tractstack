import { useState, useCallback, useRef, useMemo } from 'react';
import { TractStackAPI } from '@/utils/api';

export interface SearchResults {
  storyFragmentIds: string[];
  contextPaneIds: string[];
  resourceIds: string[];
}

interface UseSearchReturn {
  searchResults: SearchResults;
  isLoading: boolean;
  error: string | null;
  totalResults: number;
  executeSearch: (query: string) => void;
  clearResults: () => void;
}

const DEBOUNCE_MS = 100;
const BACKEND_THROTTLE_MS = 1000;

export function useSearch(): UseSearchReturn {
  const [searchResults, setSearchResults] = useState<SearchResults>({
    storyFragmentIds: [],
    contextPaneIds: [],
    resourceIds: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout>();
  const lastSearchTimeRef = useRef<number>(0);
  const queuedQueryRef = useRef<string | null>(null);
  const queueTimeoutRef = useRef<NodeJS.Timeout>();
  const isFirstSearchRef = useRef<boolean>(true);

  const api = useMemo(() => new TractStackAPI(), []);

  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || query.trim().length < 3) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await api.search(query.trim());

        if (response.success && response.data) {
          setSearchResults(response.data);
          lastSearchTimeRef.current = Date.now();
        } else {
          // Handle 429 silently - backend is protecting itself
          if (response.error?.includes('too frequently')) {
            // Don't set error for rate limiting, just maintain loading state
            return;
          }
          setError(response.error || 'Search failed');
          setSearchResults({
            storyFragmentIds: [],
            contextPaneIds: [],
            resourceIds: [],
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults({
          storyFragmentIds: [],
          contextPaneIds: [],
          resourceIds: [],
        });
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const processQueue = useCallback(() => {
    if (queuedQueryRef.current) {
      const queryToProcess = queuedQueryRef.current;
      queuedQueryRef.current = null;
      performSearch(queryToProcess);
    }
  }, [performSearch]);

  const executeSearchWithThrottling = useCallback(
    (query: string) => {
      const now = Date.now();
      const timeSinceLastSearch = now - lastSearchTimeRef.current;

      // First search or enough time has passed - execute immediately
      if (
        isFirstSearchRef.current ||
        timeSinceLastSearch >= BACKEND_THROTTLE_MS
      ) {
        isFirstSearchRef.current = false;
        performSearch(query);
      } else {
        // Queue the search and schedule it to run when throttle window expires
        queuedQueryRef.current = query;

        // Clear any existing queue timeout
        if (queueTimeoutRef.current) {
          clearTimeout(queueTimeoutRef.current);
        }

        // Schedule execution for when the throttle window expires
        const remainingTime = BACKEND_THROTTLE_MS - timeSinceLastSearch;
        queueTimeoutRef.current = setTimeout(processQueue, remainingTime);
      }
    },
    [performSearch, processQueue]
  );

  const executeSearch = useCallback(
    (query: string) => {
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Handle empty or short queries immediately
      if (!query.trim() || query.trim().length < 3) {
        setSearchResults({
          storyFragmentIds: [],
          contextPaneIds: [],
          resourceIds: [],
        });
        setError(null);
        setIsLoading(false);
        return;
      }

      // Debounce the actual search execution
      debounceRef.current = setTimeout(() => {
        executeSearchWithThrottling(query);
      }, DEBOUNCE_MS);
    },
    [executeSearchWithThrottling]
  );

  const clearResults = useCallback(() => {
    // Clear all timeouts
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
    }

    // Reset state
    setSearchResults({
      storyFragmentIds: [],
      contextPaneIds: [],
      resourceIds: [],
    });
    setIsLoading(false);
    setError(null);
    queuedQueryRef.current = null;
    isFirstSearchRef.current = true;
  }, []);

  const totalResults =
    searchResults.storyFragmentIds.length +
    searchResults.contextPaneIds.length +
    searchResults.resourceIds.length;

  return {
    searchResults,
    isLoading,
    error,
    totalResults,
    executeSearch,
    clearResults,
  };
}
