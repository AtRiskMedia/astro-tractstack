import { useState, useMemo } from 'react';
import { Pagination } from '@ark-ui/react/pagination';
import type { SearchResults as SearchResultsType } from '@/hooks/useSearch';
import type { FullContentMapItem } from '@/types/tractstack';
import {
  getResourceUrl,
  getResourceImage,
  getResourceDescription,
} from '@/utils/customHelpers';

interface SearchResultsProps {
  results: SearchResultsType;
  contentMap: FullContentMapItem[];
  onResultClick: () => void;
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
  onResultClick,
}: SearchResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const allResultItems = useMemo(() => {
    const items: ResultItem[] = [];

    results.storyFragmentIds.forEach((id) => {
      const item = contentMap.find(
        (item) => item.id === id && item.type === 'StoryFragment'
      );
      if (item) {
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
      }
    });

    results.contextPaneIds.forEach((id) => {
      const item = contentMap.find(
        (item) => item.id === id && item.type === 'Pane'
      );
      if (item) {
        items.push({
          id: item.id,
          type: 'ContextPane',
          title: item.title,
          slug: item.slug,
          url: `/context/${item.slug}`,
          imageSrc: '/static.jpg',
        });
      }
    });

    results.resourceIds.forEach((id) => {
      const item = contentMap.find(
        (item) => item.id === id && item.type === 'Resource'
      );
      if (item) {
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
      }
    });

    return items.sort((a, b) => {
      const aHasRealImage = a.imageSrc !== '/static.jpg';
      const bHasRealImage = b.imageSrc !== '/static.jpg';

      if (aHasRealImage && !bHasRealImage) return -1;
      if (!aHasRealImage && bHasRealImage) return 1;
      return 0;
    });
  }, [results]);

  const totalPages = Math.ceil(allResultItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = allResultItems.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handlePageChange = (details: { page: number }) => {
    setCurrentPage(details.page);
  };

  const getResultBadge = (type: string, categorySlug?: string) => {
    switch (type) {
      case 'StoryFragment':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
            Page
          </span>
        );
      case 'ContextPane':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            Context
          </span>
        );
      case 'Resource':
        return (
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
            {categorySlug || 'Resource'}
          </span>
        );
      default:
        return null;
    }
  };

  if (allResultItems.length === 0) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-mydarkgrey text-lg font-bold">
          {allResultItems.length} result{allResultItems.length !== 1 ? 's' : ''}{' '}
          found
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Showing {startIndex + 1}-
          {Math.min(startIndex + ITEMS_PER_PAGE, allResultItems.length)} of{' '}
          {allResultItems.length}
        </p>
      </div>

      <div className="mb-8 space-y-4">
        {paginatedItems.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-100"
          >
            <a href={item.url} onClick={onResultClick} className="group block">
              <div className="flex items-start gap-4">
                <div
                  className="bg-mydarkgrey flex-shrink-0 overflow-hidden rounded-lg p-1 md:hidden"
                  style={{
                    width: '100px',
                    height: '56px',
                  }}
                  data-mobile-size="100x56"
                >
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="h-full w-full rounded object-contain"
                  />
                </div>

                <div
                  className="bg-mydarkgrey hidden flex-shrink-0 overflow-hidden rounded-lg p-1 md:block"
                  style={{
                    width: '240px',
                    height: '135px',
                  }}
                  data-desktop-size="240x135"
                >
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="h-full w-full rounded object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2">
                        <h3 className="text-mydarkgrey group-hover:text-myblue line-clamp-2 font-bold transition-colors">
                          {item.title}
                        </h3>
                      </div>

                      {(item.type === 'StoryFragment' ||
                        item.type === 'Resource') &&
                        item.description && (
                          <p className="mb-2 line-clamp-2 text-sm text-gray-600">
                            {item.description}
                          </p>
                        )}

                      {item.topics && item.topics.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {item.topics.slice(0, 3).map((topic) => (
                            <span
                              key={topic}
                              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                            >
                              {topic}
                            </span>
                          ))}
                          {item.topics.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{item.topics.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <p className="truncate text-xs text-gray-500">
                        {item.url}
                      </p>

                      {/* Mobile badge row */}
                      <div className="mt-2 block md:hidden">
                        {getResultBadge(item.type, item.categorySlug)}
                      </div>
                    </div>

                    <div className="hidden flex-shrink-0 text-right md:block">
                      <div className="mb-2">
                        {getResultBadge(item.type, item.categorySlug)}
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
        <div className="mt-8 flex justify-center">
          <Pagination.Root
            count={allResultItems.length}
            pageSize={ITEMS_PER_PAGE}
            page={currentPage}
            siblingCount={1}
            onPageChange={handlePageChange}
            className="flex flex-wrap items-center gap-2"
          >
            <Pagination.Context>
              {(pagination) =>
                pagination.pages.map((page, index) =>
                  page.type === 'page' ? (
                    <Pagination.Item
                      key={index}
                      {...page}
                      className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                        page.value === currentPage
                          ? 'bg-gray-900 text-white'
                          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page.value}
                    </Pagination.Item>
                  ) : (
                    <Pagination.Ellipsis
                      key={index}
                      index={index}
                      className="px-3 py-2 text-sm text-gray-500"
                    >
                      …
                    </Pagination.Ellipsis>
                  )
                )
              }
            </Pagination.Context>
          </Pagination.Root>
        </div>
      )}
    </div>
  );
}
