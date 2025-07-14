import { useState, useEffect, useRef } from 'react';
import { Switch } from '@ark-ui/react';
import { useStore } from '@nanostores/react';
import { epinetCustomFilters } from '../../stores/analytics';
import { classNames } from '../../utils/helpers';
import type { FullContentMapItem } from 'templates/src/types/tractstack';

interface HotItem {
  id: string;
  totalEvents: number;
}

interface StoryKeepDashboardContentProps {
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

const StoryKeepDashboard_Content = ({
  analytics,
  fullContentMap,
  homeSlug,
}: StoryKeepDashboardContentProps) => {
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
    return isEdit ? `${basePath}/edit` : basePath;
  };

  const getEventCount = (pageId: string): number => {
    if (!hotContent || hotContent.length === 0) return 0;
    return hotContent.find((h: HotItem) => h.id === pageId)?.totalEvents || 0;
  };

  const setStandardDuration = (hours: number) => {
    const nowUTC = new Date();
    const startTimeUTC = new Date(nowUTC.getTime() - hours * 60 * 60 * 1000);

    epinetCustomFilters.set({
      ...$epinetCustomFilters,
      startTimeUTC: startTimeUTC.toISOString(),
      endTimeUTC: nowUTC.toISOString(),
    });
  };

  const getCurrentPreset = () => {
    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;
    if (!startTimeUTC || !endTimeUTC) return null;

    const now = new Date();
    const start = new Date(startTimeUTC);
    const diffHours = Math.round(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60)
    );

    if (diffHours === 24) return '24h';
    if (diffHours === 168) return '7d';
    if (diffHours === 672) return '28d';
    return null;
  };

  const currentPreset = getCurrentPreset();

  const formatCurrentUTCRange = () => {
    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;
    if (!startTimeUTC || !endTimeUTC) return '';

    const startLocal = new Date(startTimeUTC);
    const endLocal = new Date(endTimeUTC);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const startDate = startLocal.toLocaleDateString('en-US');
    const endDate = endLocal.toLocaleDateString('en-US');

    const startHour = startLocal.getHours();
    const endHour = endLocal.getHours();

    const formatHour = (hour: number, minutes: string) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${period}`;
    };

    const startTime = formatHour(startHour, '00');
    const endTime = formatHour(endHour, '59');

    return `${startDate}, ${startTime} to ${endDate}, ${endTime} (${timeZone})`;
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
        <div className="text-sm font-medium text-gray-700">
          Show analytics for:
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStandardDuration(24)}
            className={classNames(
              'rounded-md px-3 py-1 text-sm font-medium transition-colors',
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
              'rounded-md px-3 py-1 text-sm font-medium transition-colors',
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
              'rounded-md px-3 py-1 text-sm font-medium transition-colors',
              currentPreset === '28d'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-cyan-100 hover:text-cyan-800'
            )}
          >
            28 Days
          </button>
        </div>
        {$epinetCustomFilters.startTimeUTC &&
          $epinetCustomFilters.endTimeUTC && (
            <div className="mt-3 text-xs italic text-gray-500">
              {formatCurrentUTCRange()}
            </div>
          )}
      </div>

      <div id="browse" className="space-y-4">
        <div className="flex flex-col space-y-4 px-3.5 md:flex-row md:items-center md:justify-between md:space-x-6 md:space-y-0">
          <div className="relative w-full xl:w-1/3">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-sm text-black shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-cyan-600"
                placeholder="Search pages..."
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  aria-label="Clear search"
                >
                  <span className="text-gray-400 hover:text-gray-600">×</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6">
            <div className="flex items-center whitespace-nowrap">
              <Switch.Root
                checked={showMostActive}
                onCheckedChange={() => setShowMostActive(!showMostActive)}
                aria-label="Sort by most active"
                className="inline-flex items-center"
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
                      style={{ paddingBottom: '17.5%' }}
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
                      {page.slug === homeSlug && (
                        <span className="inline-flex w-fit items-center rounded-full bg-cyan-600 px-1 py-0.5 text-xs font-bold text-white">
                          Home
                        </span>
                      )}
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                        <span>
                          {isAnalyticsLoading ? (
                            <span className="inline-flex items-center">
                              <span className="animate-pulse text-cyan-600">
                                Loading events...
                              </span>
                            </span>
                          ) : (
                            `${events} events`
                          )}
                        </span>
                        <span className="flex space-x-1">
                          <a
                            href={getContentUrl(page)}
                            className="pl-2 text-lg text-cyan-600 underline hover:text-cyan-700"
                            title="Visit this Page"
                          >
                            Visit
                          </a>
                          {` `}
                          <a
                            href={getContentUrl(page, true)}
                            className="pl-2 text-lg text-cyan-600 underline hover:text-cyan-700"
                            title="Edit this Page"
                          >
                            Edit
                          </a>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={classNames(
                        'rounded-md px-3 py-1 text-sm',
                        currentPage === page
                          ? 'bg-cyan-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-cyan-50'
                      )}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StoryKeepDashboard_Content;
