import {
  useState,
  useMemo,
  useEffect,
  useRef,
  type KeyboardEvent,
} from 'react';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { useSearch } from '@/hooks/useSearch';
import type {
  FullContentMapItem,
  DiscoverySuggestion,
} from '@/types/tractstack';
import {
  getResourceUrl,
  getResourceImage,
  getResourceDescription,
} from '@/utils/customHelpers';

// --- TYPES ---
interface SearchWidgetProps {
  fullContentMap: FullContentMapItem[];
}

interface ResultItem {
  id: string;
  url: string;
  title: string;
  imageSrc: string;
  thumbSrcSet?: string;
  description?: string;
  topics?: string[];
}

const ITEMS_PER_PAGE = 10;

function ResultItemCard({ item }: { item: ResultItem }) {
  return (
    <a href={item.url} className="group block">
      <div className="flex items-start space-x-4 rounded-md p-2 group-hover:bg-slate-200/20">
        <div
          className="w-36 flex-shrink-0 rounded-md bg-gray-200 md:w-48 xl:w-72"
          style={{ aspectRatio: '1200 / 630' }}
        >
          <img
            src={item.imageSrc}
            srcSet={item.thumbSrcSet}
            alt={item.title}
            style={{ aspectRatio: 1200 / 630 }}
            className="w-36 flex-shrink-0 rounded-md md:w-48 xl:w-72"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-black transition-colors group-hover:text-gray-900">
            {item.title}
          </h3>
          {item.description && (
            <p className="line-clamp-2 text-sm text-gray-800">
              {item.description}
            </p>
          )}
          {item.topics && item.topics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {item.topics.slice(0, 3).map((topic: string) => (
                <span
                  key={topic}
                  className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

function CustomPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-8 flex items-center justify-center">
      <div className="mr-4 text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </div>
      <nav className="inline-flex rounded-md shadow-sm" aria-label="Pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-l-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-r-md border border-cyan-600 bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </nav>
    </div>
  );
}

export default function SearchWidget({ fullContentMap }: SearchWidgetProps) {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSearch, setActiveSearch] = useState<DiscoverySuggestion | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    suggestions,
    isDiscovering,
    searchResults,
    isRetrieving,
    retrieveError,
    discoverTerms,
    selectSuggestion,
    selectExactMatch,
    clearAll,
  } = useSearch();

  useEffect(() => {
    if (query.trim().length >= 3) {
      discoverTerms(query);
    }
  }, [query]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchResults]);

  const handleSuggestionSelect = (suggestion: DiscoverySuggestion) => {
    setActiveSearch(suggestion);
    selectSuggestion(suggestion);
    setQuery('');
  };

  const handleExactMatch = (term: string) => {
    const searchObj = { term, type: 'EXACT' as const };
    setActiveSearch(searchObj);
    selectExactMatch(term);
    setQuery('');
  };

  const handleSuggestionClick = (suggestion: DiscoverySuggestion) => {
    handleSuggestionSelect(suggestion);
  };

  const handleNewSearch = () => {
    setActiveSearch(null);
    clearAll();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      if (query.trim().length < 3) return;

      if (suggestions.length > 0) {
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'TITLE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EXACT':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'TOPIC':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TEXT':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const suggestionForDisplay = useMemo(() => {
    if (query.length < 3 || suggestions.length === 0) {
      return null;
    }
    const exactMatch = suggestions.find(
      (s) => s.term.toLowerCase() === query.trim().toLowerCase()
    );
    return exactMatch || suggestions[0];
  }, [suggestions, query]);

  const bestCompletion = suggestionForDisplay ? suggestionForDisplay.term : '';

  const showCompletion =
    bestCompletion.toLowerCase().startsWith(query.toLowerCase()) &&
    query.length >= 3 &&
    bestCompletion.length > query.length;

  let preservedCompletion = '';
  if (showCompletion) {
    const completionText = bestCompletion.slice(query.length);
    preservedCompletion = completionText.startsWith(' ')
      ? '\u00A0' + completionText.slice(1)
      : completionText;
  }

  const allResultItems = useMemo((): ResultItem[] => {
    if (!searchResults) return [];
    const items: ResultItem[] = [];
    const combined = [
      ...searchResults.storyFragmentResults,
      ...searchResults.contextPaneResults,
      ...searchResults.resourceResults,
    ];
    combined.forEach((ftsResult) => {
      const item = fullContentMap.find(
        (mapItem) => mapItem.id === ftsResult.ID
      );
      if (item) {
        if (item.type === 'StoryFragment') {
          items.push({
            id: item.id,
            title: item.title,
            url: `/${item.slug}`,
            imageSrc: item.thumbSrc || '/static.jpg',
            thumbSrcSet: item.thumbSrcSet,
            description: item.description,
            topics: item.topics,
          });
        } else if (item.type === 'Pane' && item.isContext) {
          items.push({
            id: item.id,
            title: item.title,
            url: `/context/${item.slug}`,
            imageSrc: '/static.jpg',
            description: 'Contextual information page.',
          });
        } else if (item.type === 'Resource') {
          items.push({
            id: item.id,
            title: item.title,
            url: getResourceUrl(item.categorySlug || '', item.slug),
            imageSrc:
              getResourceImage(item.id, item.slug, item.categorySlug || '') ||
              '/static.jpg',
            description:
              getResourceDescription(
                item.id,
                item.slug,
                item.categorySlug || ''
              ) || undefined,
          });
        }
      }
    });
    return items;
  }, [searchResults, fullContentMap]);

  const totalResults = allResultItems.length;
  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = allResultItems.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );
  const leftColItems = paginatedItems.slice(
    0,
    Math.ceil(paginatedItems.length / 2)
  );
  const rightColItems = paginatedItems.slice(
    Math.ceil(paginatedItems.length / 2)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className={searchResults ? `rounded-xl border-2 p-6 md:p-12` : ``}>
        <div
          className={`relative mx-auto mb-8 ${!searchResults ? `max-w-5xl` : ``}`}
        >
          {/* PHASE 1: DISCOVERY (WHEN THERE ARE NO RESULTS) */}
          {!searchResults && (
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
                  <MagnifyingGlassIcon className="h-8 w-8 text-gray-400" />
                </div>

                {showCompletion && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex h-full w-full items-center py-5 pl-16 pr-5 text-3xl text-gray-400">
                    <span
                      className="font-bold"
                      style={{ visibility: 'hidden', whiteSpace: 'pre' }}
                    >
                      {query}
                    </span>
                    <span>{preservedCompletion}</span>
                  </div>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search for content..."
                  className="relative z-10 w-full rounded-xl border-2 border-gray-300 bg-transparent py-5 pl-16 pr-5 text-3xl font-bold text-gray-800 placeholder-gray-400 shadow-sm transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {isDiscovering && (
                <div className="mx-auto mt-2 max-w-5xl rounded-xl border border-gray-200 bg-white p-4 text-center text-gray-500 shadow-lg">
                  Discovering...
                </div>
              )}
              {suggestions.length > 0 && !isDiscovering && (
                <div className="mx-auto mt-2 max-w-5xl rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
                  <p className="mb-3 text-sm font-bold text-gray-600">
                    Suggestions
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
                        {suggestion.term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Show this block only when discovery is finished, the user has typed, and there are no suggestions. */}
              {!isDiscovering &&
                suggestions.length === 0 &&
                query.trim().length >= 3 && (
                  <div className="mx-auto mt-2 max-w-5xl rounded-xl border border-gray-200 bg-white p-4 text-center shadow-lg">
                    <p className="text-gray-600">
                      No suggestions found for "
                      <span className="font-bold">{query}</span>".
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* PHASE 2: RESULTS (WHEN A SEARCH HAS BEEN MADE) */}
          {searchResults && activeSearch && (
            <div
              className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-lg font-bold ${getTypeColor(activeSearch.type)}`}
            >
              <span>{activeSearch.term}</span>
              <button
                onClick={handleNewSearch}
                className="flex items-center justify-center rounded-full text-gray-600 hover:text-gray-800"
                aria-label={`Remove ${activeSearch.term}`}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-8">
          {isRetrieving && (
            <div className="flex justify-center p-8">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          )}
          {retrieveError && (
            <div className="rounded-md bg-red-50 p-4 text-red-700">
              <p>Error: {retrieveError}</p>
            </div>
          )}

          {searchResults && !isRetrieving && (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-black">
                  {totalResults} result{totalResults !== 1 ? 's' : ''} found
                </h2>
                {totalResults > 0 && (
                  <p className="mt-1 text-sm text-gray-800">
                    Showing {startIndex + 1}-
                    {Math.min(startIndex + ITEMS_PER_PAGE, totalResults)} of{' '}
                    {totalResults}
                  </p>
                )}
              </div>
              {totalResults > 0 ? (
                <>
                  <div className="block space-y-6 md:hidden">
                    {paginatedItems.map((item) => (
                      <ResultItemCard key={item.id} item={item} />
                    ))}
                  </div>
                  <div className="hidden md:flex md:space-x-6">
                    <div className="space-y-6 md:w-1/2">
                      {leftColItems.map((item) => (
                        <ResultItemCard key={item.id} item={item} />
                      ))}
                    </div>
                    <div className="space-y-6 md:w-1/2">
                      {rightColItems.map((item) => (
                        <ResultItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                  {totalPages > 1 && (
                    <CustomPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  )}
                </>
              ) : (
                <div className="rounded-lg bg-gray-50 px-4 py-12 text-center">
                  <p className="text-lg italic text-gray-600">
                    No results found.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
