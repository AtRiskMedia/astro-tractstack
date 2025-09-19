import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSearch } from '@/hooks/useSearch';
import SearchResults from './SearchResults';
import type { FullContentMapItem } from '@/types/tractstack';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    searchResults,
    isLoading,
    error,
    totalResults,
    executeSearch,
    clearResults,
  } = useSearch();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      clearResults();
    }
  }, [isOpen, clearResults]);

  useEffect(() => {
    if (query.trim().length >= 3) {
      executeSearch(query.trim());
    } else {
      clearResults();
    }
  }, [query, executeSearch, clearResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClose = () => {
    setQuery('');
    clearResults();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => !details.open && handleClose()}
    >
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16">
          <Dialog.Content
            className="bg-mywhite w-full max-w-4xl overflow-hidden rounded-lg shadow-2xl"
            style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Fixed Header */}
            <div
              className="flex items-center gap-4 border-b border-gray-200 p-6"
              style={{ flexShrink: 0 }}
            >
              <MagnifyingGlassIcon className="text-mydarkgrey h-6 w-6" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Search content..."
                className="text-mydarkgrey flex-1 border-none bg-transparent px-4 text-xl placeholder-gray-500 outline-none"
              />
              <button
                onClick={handleClose}
                className="text-mydarkgrey hover:text-myblue rounded-lg p-2 transition-colors hover:bg-gray-100"
                aria-label="Close search"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="overflow-y-auto" style={{ flex: 1 }}>
              {query.length < 3 && (
                <div className="p-8 text-center text-gray-500">
                  <MagnifyingGlassIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                  <p className="text-lg">Search across all content</p>
                  <p className="mt-2 text-sm">
                    Type at least 3 characters to search pages, context, and
                    resources
                  </p>
                </div>
              )}

              {query.length >= 3 && isLoading && (
                <div className="p-8 text-center">
                  <div className="border-myblue inline-block h-8 w-8 animate-spin rounded-full border-b-2"></div>
                  <p className="text-mydarkgrey mt-4">Searching...</p>
                </div>
              )}

              {query.length >= 3 && error && (
                <div className="p-8 text-center text-red-600">
                  <p>Search failed: {error}</p>
                  <button
                    onClick={() => executeSearch(query.trim())}
                    className="text-myblue mt-2 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {query.length >= 3 &&
                !isLoading &&
                !error &&
                totalResults === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-lg">No results found for "{query}"</p>
                    <p className="mt-2 text-sm">
                      Try different keywords or check your spelling
                    </p>
                  </div>
                )}

              {query.length >= 3 &&
                !isLoading &&
                !error &&
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
