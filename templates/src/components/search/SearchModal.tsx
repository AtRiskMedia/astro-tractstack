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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleClose = () => {
    setQuery('');
    clearResults();
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
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
        <Dialog.Positioner className="fixed inset-0 z-50 mx-auto max-w-3xl p-2 pt-16 md:p-4">
          <Dialog.Content
            className="bg-mywhite mx-auto w-full overflow-hidden rounded-lg shadow-2xl"
            style={{ height: '80vh' }}
          >
            {/* Fixed Header */}
            <div className="relative w-full border-b border-gray-200 p-4">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Search content..."
                className="text-mydarkgrey w-full border-none bg-transparent px-6 py-2 text-xl placeholder-gray-500 outline-none"
              />
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
              {query.length < 3 && (
                <div className="w-full p-8 text-center text-gray-500">
                  <MagnifyingGlassIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                  <p className="text-lg">Search across all content</p>
                  <p className="mt-2 text-sm">
                    Type at least 3 characters to search pages, context, and
                    resources
                  </p>
                </div>
              )}

              {query.length >= 3 && isLoading && (
                <div className="w-full p-8 text-center">
                  <div className="border-myblue inline-block h-8 w-8 animate-spin rounded-full border-b-2"></div>
                  <p className="text-mydarkgrey mt-4">Searching...</p>
                </div>
              )}

              {query.length >= 3 && error && (
                <div className="w-full p-8 text-center text-red-600">
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
                  <div className="w-full p-8 text-center text-gray-500">
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
