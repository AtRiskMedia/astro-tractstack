import { useState, useEffect, useRef } from 'react';
import { Switch } from '@ark-ui/react';
import { useStore } from '@nanostores/react';
import { epinetCustomFilters } from '../../../../stores/analytics';
import { classNames } from '../../../../utils/helpers';
import type { FullContentMapItem } from '../../../../types/tractstack';

interface HotItem {
  id: string;
  totalEvents: number;
}

interface ContentBrowserProps {
  analytics: {
    dashboard: {
      hotContent?: HotItem[];
    } | null;
    isLoading: boolean;
    status: string;
    error: string | null;
  };
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
}

const ContentBrowser = ({
  analytics,
  fullContentMap,
  homeSlug,
}: ContentBrowserProps) => {
  const [isClient, setIsClient] = useState(false);
  const [showMostActive, setShowMostActive] = useState(true);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const itemsPerPage = 16;

  const inputRef = useRef<HTMLInputElement>(null);

  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const dashboard = analytics.dashboard;
  const hotContent = dashboard?.hotContent || [];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (analytics.status === 'loading' || analytics.status === 'refreshing') {
      setIsAnalyticsLoading(true);
    } else {
      setIsAnalyticsLoading(false);
    }
  }, [analytics.status]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, showMostActive]);

  const safeContentMap = Array.isArray(fullContentMap) ? fullContentMap : [];

  const filteredPages = safeContentMap
    .filter((item) => {
      const matchesType =
        item?.type === 'StoryFragment' ||
        (item?.type === 'Pane' && item?.isContext === true);
      const matchesQuery =
        !query ||
        (item?.title || '').toLowerCase().includes(query.toLowerCase());
      return matchesType && matchesQuery;
    })
    .sort((a, b) => {
      if (showMostActive && hotContent && hotContent.length > 0) {
        const aEvents =
          hotContent.find((h: HotItem) => h.id === a.id)?.totalEvents || 0;
        const bEvents =
          hotContent.find((h: HotItem) => h.id === b.id)?.totalEvents || 0;
        return bEvents - aEvents;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedPages = filteredPages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getContentUrl = (page: FullContentMapItem, isEdit = false) => {
    const basePath =
      page.type === 'Pane' && page.isContext
        ? `/context/${page.slug}`
        : `/${page.slug}`;
    return isEdit ? `${basePath}?edit=true` : basePath;
  };

  const setStandardDuration = (hours: number) => {
    const nowUTC = new Date();
    const startTimeUTC = new Date(nowUTC.getTime() - hours * 60 * 60 * 1000);
    epinetCustomFilters.set({
      ...$epinetCustomFilters,
      enabled: true,
      startTimeUTC: startTimeUTC.toISOString(),
      endTimeUTC: nowUTC.toISOString(),
    });
  };

  const currentDurationHelper = (() => {
    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;

    if (startTimeUTC && endTimeUTC) {
      const startTime = new Date(startTimeUTC);
      const endTime = new Date(endTimeUTC);
      const diffMs = endTime.getTime() - startTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (Math.abs(diffHours - 24) <= 1) return '24h';
      if (Math.abs(diffHours - 168) <= 1) return '7d';
      if (Math.abs(diffHours - 672) <= 1) return '28d';
      return 'custom';
    }

    return '7d'; // default
  })();

  const currentPreset = currentDurationHelper;

  const formatTimeRange = () => {
    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;

    if (!startTimeUTC || !endTimeUTC) return '';

    const startDate = new Date(startTimeUTC);
    const endDate = new Date(endTimeUTC);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? 'numeric'
            : undefined,
      });
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };

    return `${formatDate(startDate)}, ${formatTime(startDate)} to ${formatDate(endDate)}, ${formatTime(endDate)} (${timeZone})`;
  };

  const getEventCount = (pageId: string) => {
    return hotContent.find((h: HotItem) => h.id === pageId)?.totalEvents || 0;
  };

  if (!isClient) return null;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="font-action text-2xl font-bold text-gray-900">
          Content Management
          {(analytics.isLoading || analytics.status === 'loading') && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              (Loading data...)
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Browse and manage your StoryKeep content pages
        </p>
      </div>

      {analytics.error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">
          <h4 className="font-bold">Content Error</h4>
          <p>{analytics.error}</p>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div className="text-sm font-bold text-gray-700">
          Showing events from:
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStandardDuration(24)}
            className={classNames(
              'rounded-md px-3 py-1 text-sm font-bold transition-colors',
              currentPreset === '24h'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-cyan-100 hover:text-cyan-800'
            )}
          >
            24 Hours
          </button>
          <button
            onClick={() => setStandardDuration(7 * 24)}
            className={classNames(
              'rounded-md px-3 py-1 text-sm font-bold transition-colors',
              currentPreset === '7d'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-cyan-100 hover:text-cyan-800'
            )}
          >
            7 Days
          </button>
          <button
            onClick={() => setStandardDuration(28 * 24)}
            className={classNames(
              'rounded-md px-3 py-1 text-sm font-bold transition-colors',
              currentPreset === '28d'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-cyan-100 hover:text-cyan-800'
            )}
          >
            28 Days
          </button>
        </div>
        {currentPreset === 'custom' && (
          <div className="text-sm text-gray-600">{formatTimeRange()}</div>
        )}
      </div>

      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="relative max-w-md flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-500 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center">
          <Switch.Root
            checked={showMostActive}
            onCheckedChange={(details) => setShowMostActive(details.checked)}
          >
            <Switch.Control
              className={classNames(
                showMostActive ? 'bg-cyan-600' : 'bg-gray-200',
                'relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2'
              )}
            >
              <Switch.Thumb
                className={classNames(
                  showMostActive ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none absolute inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out'
                )}
              />
            </Switch.Control>
            <Switch.HiddenInput />
            <div className="ml-3 flex h-5 items-center">
              <Switch.Label className="text-sm leading-none">
                Sort by Most Active
              </Switch.Label>
            </div>
          </Switch.Root>
        </div>
      </div>

      {filteredPages.length === 0 ? (
        <div className="py-12 text-center text-gray-500">No pages found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {paginatedPages.map((page) => {
              const events = getEventCount(page.id);

              return (
                <div
                  key={page.id}
                  className="flex items-center space-x-3 rounded-lg bg-white p-2 shadow"
                >
                  <div
                    className="relative w-1/3"
                    style={{ aspectRatio: '1200/630' }}
                  >
                    <img
                      src={
                        'thumbSrc' in page && page.thumbSrc
                          ? page.thumbSrc
                          : '/static.jpg'
                      }
                      srcSet={
                        'thumbSrcSet' in page && page.thumbSrcSet
                          ? page.thumbSrcSet
                          : undefined
                      }
                      alt={page.title}
                      className="absolute inset-0 h-full w-full rounded-md object-cover"
                    />
                    {page.slug === homeSlug && (
                      <span className="absolute bottom-1 right-1 inline-flex w-fit items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-black">
                        Home
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between overflow-hidden">
                    <div className="truncate text-sm text-black">
                      {page.title}
                    </div>
                    <div className="truncate text-xs text-gray-600">
                      {page.slug}
                      {page.type === 'Pane' &&
                        page.isContext &&
                        ' (Context Page)'}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                      <span>
                        {isAnalyticsLoading ? 'Loading...' : `${events} events`}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <a
                        href={getContentUrl(page)}
                        className="flex-1 rounded-md bg-gray-100 px-3 py-1.5 text-center text-xs font-bold text-gray-700 transition-colors hover:bg-gray-200"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                      <a
                        href={getContentUrl(page, true)}
                        className="flex-1 rounded-md bg-cyan-600 px-3 py-1.5 text-center text-xs font-bold text-white transition-colors hover:bg-cyan-700"
                      >
                        Edit
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContentBrowser;
