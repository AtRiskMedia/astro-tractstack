import { useState, useCallback, useRef, useMemo } from 'react';
import { TractStackAPI } from '@/utils/api';
import type {
  DiscoverySuggestion,
  CategorizedResults,
} from '@/types/tractstack';

interface UseSearchReturn {
  // Discovery phase
  suggestions: DiscoverySuggestion[];
  isDiscovering: boolean;
  discoverError: string | null;

  // Retrieve phase
  searchResults: CategorizedResults | null;
  isRetrieving: boolean;
  retrieveError: string | null;

  // Actions
  discoverTerms: (query: string) => void;
  selectSuggestion: (suggestion: DiscoverySuggestion) => void;
  selectExactMatch: (term: string) => void;
  clearAll: () => void;
}

const DEBOUNCE_MS = 100;
const BACKEND_THROTTLE_MS = 1200;

export function useSearch(): UseSearchReturn {
  // Discovery state
  const [suggestions, setSuggestions] = useState<DiscoverySuggestion[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // Retrieve state
  const [searchResults, setSearchResults] = useState<CategorizedResults | null>(
    null
  );
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrieveError, setRetrieveError] = useState<string | null>(null);

  // Race condition protection
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastSearchTimeRef = useRef<number>(0);
  const pendingQueryRef = useRef<string | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout>();
  const inflightQueryRef = useRef<string | null>(null);
  const api = useMemo(() => new TractStackAPI(), []);

  const performDiscovery = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      // Check if this exact query is already inflight
      if (inflightQueryRef.current === query.trim()) {
        return;
      }

      // Mark this query as inflight
      inflightQueryRef.current = query.trim();

      setIsDiscovering(true);
      setDiscoverError(null);

      try {
        const response = await api.discover(query.trim());

        // Only process response if this is still the current inflight query
        if (inflightQueryRef.current === query.trim()) {
          if (response.success && response.data) {
            setSuggestions(response.data.suggestions);
          } else {
            setDiscoverError(response.error || 'Discovery failed');
            setSuggestions([]);
          }
        }
      } catch (err) {
        // Only process error if this is still the current inflight query
        if (inflightQueryRef.current === query.trim()) {
          setDiscoverError(
            err instanceof Error ? err.message : 'Discovery failed'
          );
          setSuggestions([]);
        }
      } finally {
        // Clear inflight tracking only if this is still the current query
        if (inflightQueryRef.current === query.trim()) {
          inflightQueryRef.current = null;
          setIsDiscovering(false);
        }
      }
    },
    [api]
  );

  const performRetrieve = useCallback(
    async (term: string, isTopic: boolean = false) => {
      setIsRetrieving(true);
      setRetrieveError(null);

      try {
        const response = await api.retrieve(term, isTopic);

        if (response.success && response.data) {
          setSearchResults(response.data);
        } else {
          setRetrieveError(response.error || 'Retrieval failed');
          setSearchResults(null);
        }
      } catch (err) {
        setRetrieveError(
          err instanceof Error ? err.message : 'Retrieval failed'
        );
        setSearchResults(null);
      } finally {
        setIsRetrieving(false);
      }
    },
    [api]
  );

  const executePendingSearch = useCallback(() => {
    if (pendingQueryRef.current) {
      const queryToExecute = pendingQueryRef.current;
      pendingQueryRef.current = null;

      // Update timestamp immediately when scheduling request, not when executing
      lastSearchTimeRef.current = Date.now();

      performDiscovery(queryToExecute);
    }
  }, [performDiscovery]);

  const discoverTerms = useCallback(
    (query: string) => {
      // Clear existing debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Clear existing throttle timer
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }

      // Clear results when starting new discovery
      setSearchResults(null);
      setRetrieveError(null);

      // Handle empty queries immediately
      if (!query.trim()) {
        setSuggestions([]);
        setDiscoverError(null);
        setIsDiscovering(false);
        pendingQueryRef.current = null;
        inflightQueryRef.current = null;
        return;
      }

      // Always store the latest query
      pendingQueryRef.current = query;

      // Debounce first - wait for user to stop typing
      debounceRef.current = setTimeout(() => {
        const now = Date.now();
        const timeSinceLastSearch = now - lastSearchTimeRef.current;

        // If enough time has passed since last search, execute immediately
        if (timeSinceLastSearch >= BACKEND_THROTTLE_MS) {
          executePendingSearch();
        } else {
          // Need to wait for throttle - schedule execution
          const remainingTime = BACKEND_THROTTLE_MS - timeSinceLastSearch;
          throttleTimeoutRef.current = setTimeout(
            executePendingSearch,
            remainingTime
          );
        }
      }, DEBOUNCE_MS);
    },
    [executePendingSearch]
  );

  const selectSuggestion = useCallback(
    (suggestion: DiscoverySuggestion) => {
      // Clear suggestions
      setSuggestions([]);
      setDiscoverError(null);

      // Perform retrieve based on suggestion type
      const isTopic = suggestion.type === 'TOPIC';
      performRetrieve(suggestion.term, isTopic);
    },
    [performRetrieve]
  );

  const selectExactMatch = useCallback(
    (term: string) => {
      // Clear suggestions
      setSuggestions([]);
      setDiscoverError(null);

      // Check if term exists in current suggestions to determine if it's a topic
      const matchingSuggestion = suggestions.find(
        (s) => s.term.toLowerCase() === term.toLowerCase()
      );
      const isTopic = matchingSuggestion?.type === 'TOPIC';

      performRetrieve(term, isTopic);
    },
    [suggestions, performRetrieve]
  );

  const clearAll = useCallback(() => {
    // Clear all timeouts
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    // Reset all state including race condition protection
    setSuggestions([]);
    setIsDiscovering(false);
    setDiscoverError(null);
    setSearchResults(null);
    setIsRetrieving(false);
    setRetrieveError(null);
    pendingQueryRef.current = null;
    inflightQueryRef.current = null;
  }, []);

  return {
    suggestions,
    isDiscovering,
    discoverError,
    searchResults,
    isRetrieving,
    retrieveError,
    discoverTerms,
    selectSuggestion,
    selectExactMatch,
    clearAll,
  };
}
