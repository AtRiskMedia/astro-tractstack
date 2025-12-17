import { useState, useMemo } from 'react';
import { Pagination } from '@ark-ui/react/pagination';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import type { CategorizedResults, FTSResult } from '@/types/tractstack';
import type { FullContentMapItem } from '@/types/tractstack';
import {
  getResourceUrl,
  getResourceImage,
  getResourceDescription,
} from '@/utils/customHelpers';

const VERBOSE = false;

interface SearchResultsProps {
  results: CategorizedResults;
  contentMap: FullContentMapItem[];
  getTypeColor: (type: string) => string;
}

interface ResultItem {
  id: string;
  type: 'StoryFragment' | 'ContextPane' | 'Resource';
  title: string;
  slug: string;
  description?: string;
  topics?: string[];
  changed?: string;
  thumbSrc?: string;
  categorySlug?: string;
  url: string;
  imageSrc: string;
}

const ITEMS_PER_PAGE = 10;

export default function SearchResults({
  results,
  contentMap,
  getTypeColor,
}: SearchResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const allResultItems = useMemo(() => {
    const items: ResultItem[] = [];

    if (VERBOSE)
      console.log('DEBUG SearchResults: Processing results', {
        storyFragmentResults: results.storyFragmentResults.length,
        contextPaneResults: results.contextPaneResults.length,
        resourceResults: results.resourceResults.length,
        contentMapSize: contentMap.length,
      });

    // Process StoryFragment results
    results.storyFragmentResults.forEach((ftsResult: FTSResult, index) => {
      if (VERBOSE) console.log(`DEBUG StoryFragment ${index}:`, ftsResult);
      const item = contentMap.find(
        (item) => item.id === ftsResult.ID && item.type === 'StoryFragment'
      );
      if (item) {
        if (VERBOSE)
          console.log(
            `DEBUG StoryFragment ${index}: Found in contentMap`,
            item
          );
        items.push({
          id: item.id,
          type: 'StoryFragment',
          title: item.title,
          slug: item.slug,
          description: item.description || undefined,
          topics: item.topics || undefined,
          changed: item.changed || undefined,
          thumbSrc: item.thumbSrc || undefined,
          url: `/${item.slug}`,
          imageSrc: item.thumbSrc || '/static.jpg',
        });
      } else {
        if (VERBOSE)
          console.log(
            `DEBUG StoryFragment ${index}: NOT found in contentMap for ID ${ftsResult.ID}`
          );
      }
    });

    // Process ContextPane results
    results.contextPaneResults.forEach((ftsResult: FTSResult, index) => {
      if (VERBOSE) console.log(`DEBUG ContextPane ${index}:`, ftsResult);
      const item = contentMap.find(
        (item) => item.id === ftsResult.ID && item.type === 'Pane'
      );
      if (item) {
        if (VERBOSE)
          console.log(`DEBUG ContextPane ${index}: Found in contentMap`, item);
        items.push({
          id: item.id,
          type: 'ContextPane',
          title: item.title,
          slug: item.slug,
          url: `/context/${item.slug}`,
          imageSrc: '/static.jpg',
        });
      } else {
        if (VERBOSE)
          console.log(
            `DEBUG ContextPane ${index}: NOT found in contentMap for ID ${ftsResult.ID}`
          );
      }
    });

    // Process Resource results
    results.resourceResults.forEach((ftsResult: FTSResult, index) => {
      if (VERBOSE) console.log(`DEBUG Resource ${index}:`, ftsResult);
      const item = contentMap.find(
        (item) => item.id === ftsResult.ID && item.type === 'Resource'
      );
      if (item) {
        if (VERBOSE)
          console.log(`DEBUG Resource ${index}: Found in contentMap`, item);

        const resourceUrl = getResourceUrl(item.categorySlug || '', item.slug);
        const resourceImage = getResourceImage(
          item.id,
          item.slug,
          item.categorySlug || ''
        );
        const description = getResourceDescription(
          item.id,
          item.slug,
          item.categorySlug || ''
        );

        if (VERBOSE)
          console.log(`DEBUG Resource ${index}: Helper results`, {
            resourceUrl,
            resourceImage,
            description,
            categorySlug: item.categorySlug,
            slug: item.slug,
            id: item.id,
          });

        items.push({
          id: item.id,
          type: 'Resource',
          title: item.title,
          slug: item.slug,
          description: description || undefined,
          categorySlug: item.categorySlug || undefined,
          url: resourceUrl,
          imageSrc: resourceImage,
        });
      } else {
        if (VERBOSE)
          console.log(
            `DEBUG Resource ${index}: NOT found in contentMap for ID ${ftsResult.ID}`
          );
        if (VERBOSE)
          console.log(
            'DEBUG: Available resource IDs in contentMap:',
            contentMap
              .filter((item) => item.type === 'Resource')
              .map((item) => ({ id: item.id, title: item.title }))
          );
      }
    });

    if (VERBOSE) console.log('DEBUG SearchResults: Final items', items);

    // Sort by whether they have real images
    return items.sort((a, b) => {
      const aHasRealImage = a.imageSrc !== '/static.jpg';
      const bHasRealImage = b.imageSrc !== '/static.jpg';

      if (aHasRealImage && !bHasRealImage) return -1;
      if (!aHasRealImage && bHasRealImage) return 1;
      return 0;
    });
  }, [results, contentMap]);

  const totalResults = allResultItems.length;
  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = allResultItems.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getResultBadge = (type: string, categorySlug?: string) => {
    let styleType = type;
    let label = '';
    switch (type) {
      case 'StoryFragment':
        label = 'Page';
        break;
      case 'ContextPane':
        label = 'Context';
        break;
      case 'Resource':
        styleType = 'COLLECTION';
        label = categorySlug || 'Resource';
        break;
      default:
        return null;
    }

    // Get the color classes but extract just the text and background colors for the inline style
    const colorClasses = getTypeColor(styleType);

    return (
      <span className={`rounded px-2 py-1 text-xs ${colorClasses}`}>
        {label}
      </span>
    );
  };

  if (totalResults === 0) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-mydarkgrey">
          {totalResults} result{totalResults !== 1 ? 's' : ''} found
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Showing {startIndex + 1}-
          {Math.min(startIndex + ITEMS_PER_PAGE, totalResults)} of{' '}
          {totalResults}
        </p>
      </div>

      <div className="mb-8 space-y-4">
        {paginatedItems.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-100"
          >
            <a href={item.url} className="group block">
              <div className="flex flex-col md:flex-row md:items-start md:gap-4">
                {/* Mobile: Full width image without overlay badge */}
                <div
                  className="relative w-full overflow-hidden rounded-lg bg-mydarkgrey md:hidden"
                  style={{ aspectRatio: '1200/630' }}
                >
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Desktop: Side image without overlay badge */}
                <div
                  className="relative hidden flex-shrink-0 overflow-hidden rounded-lg bg-mydarkgrey md:block"
                  style={{ width: '240px', height: '135px' }}
                >
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="mt-3 min-w-0 flex-1 md:mt-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="mb-2 text-lg font-bold text-mydarkgrey transition-colors group-hover:text-myblue">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="mb-2 text-sm text-mydarkgrey">
                          {item.description}
                        </p>
                      )}

                      {/* Category badge and topics in same row */}
                      <div className="mb-2 flex flex-wrap gap-1">
                        {/* Always show the category badge first */}
                        {getResultBadge(item.type, item.categorySlug)}

                        {/* Then show topics if they exist */}
                        {item.topics && item.topics.length > 0 && (
                          <>
                            {item.topics.slice(0, 3).map((topic, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-myoffwhite px-2 py-1 text-xs text-mydarkgrey"
                              >
                                {topic}
                              </span>
                            ))}
                            {item.topics.length > 3 && (
                              <span className="text-xs text-mydarkgrey">
                                +{item.topics.length - 3} more
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination.Root
            count={totalResults}
            pageSize={ITEMS_PER_PAGE}
            page={currentPage}
            onPageChange={(details) => handlePageChange(details.page)}
          >
            <Pagination.PrevTrigger className="mr-2 flex items-center gap-1 rounded px-3 py-2 text-sm font-bold text-mydarkgrey transition-colors hover:text-myblue disabled:opacity-50">
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </Pagination.PrevTrigger>

            <div className="flex items-center gap-1">
              <Pagination.Context>
                {(pagination) =>
                  pagination.pages.map((page, index) =>
                    page.type === 'page' ? (
                      <Pagination.Item
                        key={index}
                        type="page"
                        value={page.value}
                        className={`rounded px-3 py-2 text-sm font-bold transition-colors ${
                          page.value === currentPage
                            ? 'bg-myblue text-white'
                            : 'text-mydarkgrey hover:text-myblue'
                        }`}
                      >
                        {page.value}
                      </Pagination.Item>
                    ) : (
                      <span
                        key={index}
                        className="px-2 text-sm text-mydarkgrey"
                      >
                        {page.type === 'ellipsis' ? '...' : ''}
                      </span>
                    )
                  )
                }
              </Pagination.Context>
            </div>

            <Pagination.NextTrigger className="ml-2 flex items-center gap-1 rounded px-3 py-2 text-sm font-bold text-mydarkgrey transition-colors hover:text-myblue disabled:opacity-50">
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </Pagination.NextTrigger>
          </Pagination.Root>
        </div>
      )}
    </div>
  );
}
