import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSearch } from '@/hooks/useSearch';
import SearchResults from './SearchResults';
import type {
  FullContentMapItem,
  DiscoverySuggestion,
} from '@/types/tractstack';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentMap: FullContentMapItem[];
}

export default function SearchModal({
  isOpen,
  onClose,
  contentMap,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
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
  } = useSearch();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedTerms([]);
      clearAll();
    }
  }, [isOpen, clearAll]);

  useEffect(() => {
    // Only trigger discovery if query has 3+ characters
    if (query.trim().length >= 3) {
      discoverTerms(query);
    }
  }, [query, discoverTerms]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClose = () => {
    setQuery('');
    setSelectedTerms([]);
    clearAll();
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && query.trim()) {
      // Only proceed if we have suggestions or query is 3+ chars
      if (query.trim().length < 3) return;

      // If there's only one suggestion, select it
      if (suggestions.length === 1) {
        handleSuggestionSelect(suggestions[0]);
      } else if (suggestions.length > 0) {
        // Check for exact match first
        const exactMatch = suggestions.find(
          (s) => s.term.toLowerCase() === query.trim().toLowerCase()
        );
        if (exactMatch) {
          handleSuggestionSelect(exactMatch);
        } else {
          // No exact match, select first suggestion
          handleSuggestionSelect(suggestions[0]);
        }
      } else {
        // No suggestions, do exact match search
        handleExactMatch(query.trim());
      }
    }
  };

  const handleSuggestionClick = (suggestion: DiscoverySuggestion) => {
    handleSuggestionSelect(suggestion);
  };

  const handleSuggestionSelect = (suggestion: DiscoverySuggestion) => {
    // Add to selected terms if not already present
    if (!selectedTerms.includes(suggestion.term)) {
      setSelectedTerms((prev) => [...prev, suggestion.term]);
    }

    // Clear input and perform search
    setQuery('');
    selectSuggestion(suggestion);
  };

  const handleExactMatch = (term: string) => {
    // Add to selected terms if not already present
    if (!selectedTerms.includes(term)) {
      setSelectedTerms((prev) => [...prev, term]);
    }

    // Clear input and perform search
    setQuery('');
    selectExactMatch(term);
  };

  const removeTerm = (indexToRemove: number) => {
    setSelectedTerms((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
    // Clear search results when removing terms
    clearAll();
    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TOPIC':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TITLE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONTENT':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Autocomplete logic - only show when we have suggestions and query is 3+ chars
  const bestCompletion =
    suggestions.length > 0 && query.length >= 3 ? suggestions[0].term : '';
  const showCompletion =
    bestCompletion.toLowerCase().startsWith(query.toLowerCase()) &&
    query.length >= 3;

  const showSuggestions =
    suggestions.length > 0 && !searchResults && query.length >= 3;
  const showResults = searchResults !== null;
  const totalResults = searchResults
    ? searchResults.storyFragmentResults.length +
      searchResults.contextPaneResults.length +
      searchResults.resourceResults.length
    : 0;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => !details.open && handleClose()}
    >
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm" />
        <Dialog.Positioner className="fixed inset-0 z-50 mx-auto max-w-3xl p-2 pt-16 md:p-4">
          <Dialog.Content
            className="bg-mywhite mx-auto w-full overflow-hidden rounded-lg shadow-2xl"
            style={{ height: '80vh' }}
          >
            {/* Fixed Header */}
            <div className="relative w-full border-b border-gray-200 p-4">
              {/* Selected Terms Pills */}
              {selectedTerms.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedTerms.map((term, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                    >
                      <span>{term}</span>
                      <button
                        onClick={() => removeTerm(index)}
                        className="ml-1 rounded-full p-0.5 text-blue-600 hover:bg-blue-200 hover:text-blue-800"
                        aria-label={`Remove ${term}`}
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!showResults && (
                <div className="relative">
                  <div className="relative w-full border-none bg-transparent px-6 py-2 text-xl">
                    {/* Background layer with completion text */}
                    {showCompletion && (
                      <div className="pointer-events-none absolute inset-0 px-6 py-2 text-xl text-gray-400">
                        {bestCompletion}
                      </div>
                    )}
                    {/* Foreground input */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Search content..."
                      className="text-mydarkgrey relative z-10 w-full border-none bg-transparent text-xl placeholder-gray-500 outline-none"
                      style={{ background: 'transparent' }}
                    />
                  </div>
                </div>
              )}
              <button
                onClick={handleClose}
                className="text-mydarkgrey hover:text-myblue absolute right-4 top-6 rounded-lg p-2 transition-colors hover:bg-gray-100"
                aria-label="Close search"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div
              className="w-full overflow-y-auto"
              style={{ height: 'calc(80vh - 80px)' }}
            >
              {/* Initial State */}
              {!query.trim() && selectedTerms.length === 0 && (
                <div className="w-full p-8 text-center text-gray-500">
                  <MagnifyingGlassIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                  <p className="text-lg">Search across all content</p>
                  <p className="mt-2 text-sm">
                    Start typing to discover content suggestions
                  </p>
                </div>
              )}

              {/* Show message for less than 3 characters */}
              {query.trim() && query.trim().length < 3 && (
                <div className="w-full p-8 text-center text-gray-500">
                  <p className="text-lg">Keep typing...</p>
                  <p className="mt-2 text-sm">
                    Need at least 3 characters to search
                  </p>
                </div>
              )}

              {/* Discovery Loading */}
              {query.trim().length >= 3 && isDiscovering && (
                <div className="w-full p-8 text-center">
                  <div className="border-myblue inline-block h-8 w-8 animate-spin rounded-full border-b-2"></div>
                  <p className="text-mydarkgrey mt-4">Discovering...</p>
                </div>
              )}

              {/* Discovery Error */}
              {query.trim().length >= 3 && discoverError && (
                <div className="w-full p-8 text-center text-red-600">
                  <p>Discovery failed: {discoverError}</p>
                  <button
                    onClick={() => discoverTerms(query.trim())}
                    className="text-myblue mt-2 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Suggestion Pills */}
              {showSuggestions && (
                <div className="w-full p-6">
                  <p className="text-mydarkgrey mb-4 text-sm font-medium">
                    Suggestions ({suggestions.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all hover:shadow-md ${getTypeColor(suggestion.type)}`}
                      >
                        <span>{suggestion.term}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-mydarkgrey mt-4 text-xs">
                    Click a suggestion or press Enter to search
                  </p>
                </div>
              )}

              {/* Retrieve Loading */}
              {isRetrieving && (
                <div className="w-full p-8 text-center">
                  <div className="border-myblue inline-block h-8 w-8 animate-spin rounded-full border-b-2"></div>
                  <p className="text-mydarkgrey mt-4">Searching...</p>
                </div>
              )}

              {/* Retrieve Error */}
              {retrieveError && (
                <div className="w-full p-8 text-center text-red-600">
                  <p>Search failed: {retrieveError}</p>
                </div>
              )}

              {/* No Results */}
              {!isRetrieving &&
                !retrieveError &&
                showResults &&
                totalResults === 0 && (
                  <div className="w-full p-8 text-center text-gray-500">
                    <p className="text-lg">No results found</p>
                    <p className="mt-2 text-sm">
                      Try different keywords or check your spelling
                    </p>
                  </div>
                )}

              {/* Search Results */}
              {!isRetrieving &&
                !retrieveError &&
                showResults &&
                totalResults > 0 && (
                  <SearchResults
                    results={searchResults}
                    contentMap={contentMap}
                    onResultClick={handleClose}
                  />
                )}
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
