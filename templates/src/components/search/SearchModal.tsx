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

// 1. Define a new type for the selected suggestions to include their type
interface SelectedSuggestion {
  term: string;
  type: string;
}

export default function SearchModal({
  isOpen,
  onClose,
  contentMap,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  // 2. Update state to use the new type instead of just string[]
  const [selectedSuggestions, setSelectedSuggestions] = useState<
    SelectedSuggestion[]
  >([]);
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
      // 3. Update cleanup logic to use the new state
      setSelectedSuggestions([]);
      clearAll();
    }
  }, [isOpen, clearAll]);

  useEffect(() => {
    if (query.trim().length >= 3) {
      discoverTerms(query);
    }
  }, [query, discoverTerms]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClose = () => {
    setQuery('');
    // 4. Update cleanup logic to use the new state
    setSelectedSuggestions([]);
    clearAll();
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && query.trim()) {
      if (query.trim().length < 3) return;

      if (suggestions.length === 1) {
        handleSuggestionSelect(suggestions[0]);
      } else if (suggestions.length > 0) {
        const exactMatch = suggestions.find(
          (s) => s.term.toLowerCase() === query.trim().toLowerCase()
        );
        if (exactMatch) {
          handleSuggestionSelect(exactMatch);
        } else {
          handleSuggestionSelect(suggestions[0]);
        }
      } else {
        handleExactMatch(query.trim());
      }
    }
  };

  const handleSuggestionClick = (suggestion: DiscoverySuggestion) => {
    handleSuggestionSelect(suggestion);
  };

  const handleSuggestionSelect = (suggestion: DiscoverySuggestion) => {
    // 5. Update how suggestions are added to the state
    // Check for duplicates before adding
    if (!selectedSuggestions.some((s) => s.term === suggestion.term)) {
      setSelectedSuggestions((prev) => [
        ...prev,
        { term: suggestion.term, type: suggestion.type },
      ]);
    }

    setQuery('');
    selectSuggestion(suggestion);
  };

  const handleExactMatch = (term: string) => {
    // 6. Update exact match handling to add a default type
    // From the legend, "Exact Match" uses the 'EXACT' style
    if (!selectedSuggestions.some((s) => s.term === term)) {
      setSelectedSuggestions((prev) => [...prev, { term, type: 'EXACT' }]);
    }

    setQuery('');
    selectExactMatch(term);
  };

  const removeTerm = (indexToRemove: number) => {
    // 7. Update remove logic to use the new state
    setSelectedSuggestions((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
    clearAll();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TOPIC':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'EXACT':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'TEXT':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 8. (Optional but recommended) Create a helper for the 'X' button color
  const getCloseButtonColor = (type: string) => {
    switch (type) {
      case 'TOPIC':
        return 'text-purple-600 hover:text-purple-800';
      case 'EXACT':
        return 'text-orange-600 hover:text-orange-800';
      case 'TEXT':
        return 'text-green-600 hover:text-green-800';
      default:
        return 'text-gray-600 hover:text-gray-800';
    }
  };

  const bestCompletion =
    suggestions.length > 0 && query.length >= 3 ? suggestions[0].term : '';
  const showCompletion =
    bestCompletion.toLowerCase().startsWith(query.toLowerCase()) &&
    query.length >= 3;
  let preservedCompletion = '';
  if (showCompletion) {
    const completionText = bestCompletion.slice(query.length);
    preservedCompletion = completionText.startsWith(' ')
      ? '\u00A0' + completionText.slice(1)
      : completionText;
  }
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
            <div className="relative w-full border-b border-gray-200 p-4">
              {/* 9. Update the rendering of selected term pills */}
              {selectedSuggestions.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      // Use getTypeColor to dynamically set the class
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold ${getTypeColor(
                        suggestion.type
                      )}`}
                    >
                      <span>{suggestion.term}</span>
                      <button
                        onClick={() => removeTerm(index)}
                        // Use the new helper for the button color
                        className={`flex items-center justify-center rounded-full ${getCloseButtonColor(
                          suggestion.type
                        )}`}
                        aria-label={`Remove ${suggestion.term}`}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!showResults && (
                <div className="relative w-full px-6 py-2">
                  {showCompletion && (
                    <div className="pointer-events-none absolute left-0 top-0 flex h-full w-full items-center px-6 py-2 text-xl text-gray-400">
                      <span style={{ visibility: 'hidden', whiteSpace: 'pre' }}>
                        {query}
                      </span>
                      {preservedCompletion}
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Search content..."
                    className="text-mydarkgrey relative z-10 w-full border-none bg-transparent text-xl placeholder-gray-500 outline-none"
                    style={{ background: 'transparent', padding: '0' }}
                  />
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

            <div
              className="w-full overflow-y-auto"
              style={{ height: 'calc(80vh - 80px)' }}
            >
              {/* 10. Final cleanup logic update */}
              {!query.trim() && selectedSuggestions.length === 0 && (
                <div className="w-full p-8 text-center text-gray-500">
                  <MagnifyingGlassIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                  <p className="text-lg">Search across all content</p>
                  <p className="mt-2 text-sm">
                    Start typing to discover content suggestions
                  </p>
                </div>
              )}

              {query.trim() && query.trim().length < 3 && (
                <div className="w-full p-8 text-center text-gray-500">
                  <p className="text-lg">Keep typing...</p>
                  <p className="mt-2 text-sm">
                    Need at least 3 characters to search
                  </p>
                </div>
              )}

              {query.trim().length >= 3 && isDiscovering && (
                <div className="w-full p-8 text-center">
                  <div className="border-myblue inline-block h-8 w-8 animate-spin rounded-full border-b-2"></div>
                  <p className="text-mydarkgrey mt-4">Discovering...</p>
                </div>
              )}

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

              {showSuggestions && (
                <div className="w-full p-6">
                  <p className="text-mydarkgrey mb-4 text-sm font-bold">
                    Suggestions ({suggestions.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-bold transition-all hover:shadow-md ${getTypeColor(
                          suggestion.type
                        )}`}
                      >
                        <span>{suggestion.term}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-mydarkgrey mt-4 text-xs">
                    Click a suggestion or press Enter to search
                  </p>
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                      <span className="font-bold">Legend:</span>
                      <span
                        className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-bold ${getTypeColor(
                          'EXACT'
                        )}`}
                      >
                        Exact Match
                      </span>
                      <span
                        className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-bold ${getTypeColor(
                          'TOPIC'
                        )}`}
                      >
                        Topic
                      </span>
                      <span
                        className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-bold ${getTypeColor(
                          'TEXT'
                        )}`}
                      >
                        Text Match
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isRetrieving && (
                <div className="w-full p-8 text-center">
                  <div className="border-myblue inline-block h-8 w-8 animate-spin rounded-full border-b-2"></div>
                  <p className="text-mydarkgrey mt-4">Searching...</p>
                </div>
              )}

              {retrieveError && (
                <div className="w-full p-8 text-center text-red-600">
                  <p>Search failed: {retrieveError}</p>
                </div>
              )}

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

              {!isRetrieving &&
                !retrieveError &&
                showResults &&
                totalResults > 0 && (
                  <SearchResults
                    results={searchResults}
                    contentMap={contentMap}
                    getTypeColor={getTypeColor}
                  />
                )}
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
