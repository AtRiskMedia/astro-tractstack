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

const DEBOUNCE_MS = 150;
const BACKEND_THROTTLE_MS = 1200;

export function useSearch(): UseSearchReturn {
  // Discovery state
  const [suggestions, setSuggestions] = useState<DiscoverySuggestion[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const tenantId =
    (typeof window !== 'undefined' && window.TRACTSTACK_CONFIG?.tenantId) ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';

  const [searchResults, setSearchResults] = useState<CategorizedResults | null>(
    null
  );
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrieveError, setRetrieveError] = useState<string | null>(null);

  const searchTimerRef = useRef<NodeJS.Timeout>();
  const lastExecutionTimeRef = useRef<number>(0);
  const pendingQueryRef = useRef<string | null>(null);
  const inflightQueryRef = useRef<string | null>(null);
  const api = useMemo(() => new TractStackAPI(tenantId), []);

  const performDiscovery = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      if (inflightQueryRef.current === query.trim()) {
        return;
      }

      inflightQueryRef.current = query.trim();
      setIsDiscovering(true);
      setDiscoverError(null);

      try {
        const response = await api.discover(query.trim());

        if (inflightQueryRef.current === query.trim()) {
          if (response.success && response.data) {
            setSuggestions(response.data.suggestions);
          } else {
            setDiscoverError(response.error || 'Discovery failed');
            setSuggestions([]);
          }
        }
      } catch (err) {
        if (inflightQueryRef.current === query.trim()) {
          setDiscoverError(
            err instanceof Error ? err.message : 'Discovery failed'
          );
          setSuggestions([]);
        }
      } finally {
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

  const discoverTerms = useCallback(
    (query: string) => {
      // Clear any existing timer.
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
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

      // Always store the latest query for the next execution
      pendingQueryRef.current = query;

      const now = Date.now();
      const timeSinceLastSearch = now - lastExecutionTimeRef.current;

      // Start with the basic debounce delay
      let delay = DEBOUNCE_MS;

      // If we are inside the throttle window, we must wait longer
      if (timeSinceLastSearch < BACKEND_THROTTLE_MS) {
        const remainingThrottle = BACKEND_THROTTLE_MS - timeSinceLastSearch;
        delay = Math.max(delay, remainingThrottle);
      }

      searchTimerRef.current = setTimeout(() => {
        // Double check there's a query to run
        if (pendingQueryRef.current !== null) {
          const queryToExecute = pendingQueryRef.current;

          // Update execution time as soon as the search is initiated
          lastExecutionTimeRef.current = Date.now();
          performDiscovery(queryToExecute);
        }
      }, delay);
    },
    [performDiscovery]
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
    // Clear the main search timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // Reset all state
    setSuggestions([]);
    setIsDiscovering(false);
    setDiscoverError(null);
    setSearchResults(null);
    setIsRetrieving(false);
    setRetrieveError(null);
    pendingQueryRef.current = null;
    inflightQueryRef.current = null;
    lastExecutionTimeRef.current = 0; // Reset throttle timer
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
