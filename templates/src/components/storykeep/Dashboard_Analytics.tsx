import { useState, useCallback, useMemo, Component } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import { epinetCustomFilters } from '@/stores/analytics';
import { classNames } from '@/utils/helpers';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import DashboardActivity from './Dashboard_Activity';
import SankeyDiagram from '../codehooks/SankeyDiagram';
import EpinetDurationSelector from '../codehooks/EpinetDurationSelector';
import FetchAnalytics from './state/FetchAnalytics';
import type { FullContentMapItem } from '@/types/tractstack';

interface StoryKeepDashboardAnalyticsProps {
  fullContentMap: FullContentMapItem[];
  initializing?: boolean;
}

// Helper component for error boundary
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const DurationSelector = ({
  currentDurationHelper,
  setStandardDuration,
}: {
  currentDurationHelper: 'daily' | 'weekly' | 'monthly' | 'custom';
  setStandardDuration: (duration: 'daily' | 'weekly' | 'monthly') => void;
}) => {
  const periods = [
    { value: 'daily', label: '24 Hours' },
    { value: 'weekly', label: '7 Days' },
    { value: 'monthly', label: '28 Days' },
  ] as const;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold text-gray-900">Time Range:</span>
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => setStandardDuration(period.value)}
          className={classNames(
            'rounded px-3 py-1 text-sm transition-colors',
            currentDurationHelper === period.value
              ? 'bg-cyan-600 font-bold text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-cyan-100 hover:text-cyan-800'
          )}
        >
          {period.label}
        </button>
      ))}
      {currentDurationHelper === 'custom' && (
        <span className="px-3 py-1 text-sm italic text-gray-600">
          Custom range active
        </span>
      )}
    </div>
  );
};

export default function StoryKeepDashboard_Analytics({
  fullContentMap,
  initializing = false,
}: StoryKeepDashboardAnalyticsProps) {
  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const [isDownloading, setIsDownloading] = useState(false);

  // Analytics data state
  const [analytics, setAnalytics] = useState<{
    dashboard: any;
    leads: any;
    epinet: any;
    userCounts: any[];
    hourlyNodeActivity: any;
    isLoading: boolean;
    status: string;
    error: string | null;
  }>({
    dashboard: null,
    leads: null,
    epinet: null,
    userCounts: [],
    hourlyNodeActivity: {},
    isLoading: false,
    status: 'idle',
    error: null,
  });

  const handleBeliefFilterChange = (beliefSlug: string, value: string) => {
    const tenantId = window.TRACTSTACK_CONFIG?.tenantId || 'default';
    const currentFilters = epinetCustomFilters.get();
    let newFilters = [...(currentFilters.appliedFilters || [])];

    if (value === 'All') {
      newFilters = newFilters.filter((f) => f.beliefSlug !== beliefSlug);
    } else {
      const existingIndex = newFilters.findIndex(
        (f) => f.beliefSlug === beliefSlug
      );
      if (existingIndex > -1) {
        newFilters[existingIndex] = { beliefSlug, value };
      } else {
        newFilters.push({ beliefSlug, value });
      }
    }

    epinetCustomFilters.set(tenantId, {
      ...currentFilters,
      appliedFilters: newFilters,
    });
  };

  // Duration helper for UI
  const currentDurationHelper = useMemo(():
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'custom' => {
    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;

    if (startTimeUTC && endTimeUTC) {
      const startTime = new Date(startTimeUTC);
      const endTime = new Date(endTimeUTC);
      const diffMs = endTime.getTime() - startTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (Math.abs(diffHours - 24) <= 1) return 'daily';
      if (Math.abs(diffHours - 168) <= 1) return 'weekly';
      if (Math.abs(diffHours - 672) <= 1) return 'monthly';
      return 'custom';
    }

    return 'monthly';
  }, [$epinetCustomFilters.startTimeUTC, $epinetCustomFilters.endTimeUTC]);

  // Standard duration setter helper
  const setStandardDuration = useCallback(
    (newValue: 'daily' | 'weekly' | 'monthly') => {
      const nowUTC = new Date();
      const hoursBack: number =
        newValue === 'daily' ? 24 : newValue === 'weekly' ? 168 : 672;
      const startTimeUTC = new Date(
        nowUTC.getTime() - hoursBack * 60 * 60 * 1000
      );

      epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
        ...$epinetCustomFilters,
        enabled: true,
        startTimeUTC: startTimeUTC.toISOString(),
        endTimeUTC: nowUTC.toISOString(),
      });
    },
    [$epinetCustomFilters]
  );

  // Download leads CSV
  const downloadLeadsCSV = async () => {
    if (isDownloading) return;
    try {
      setIsDownloading(true);

      const config = window.TRACTSTACK_CONFIG;
      const response = await fetch(
        `${config?.backendUrl || ''}/api/v1/admin/leads/download`,
        {
          method: 'GET',
          headers: {
            'X-Tenant-ID': config?.tenantId || 'default',
          },
          credentials: 'include', // Include cookies for auth
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading leads:', error);
      alert('Failed to download leads. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper function for number formatting
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  // Prepare stats data for display
  const stats = [
    {
      name: 'Past 24 Hours',
      events: analytics.dashboard?.stats?.daily ?? 0,
      period: '24h',
    },
    {
      name: 'Past 7 Days',
      events: analytics.dashboard?.stats?.weekly ?? 0,
      period: '7d',
    },
    {
      name: 'Past 28 Days',
      events: analytics.dashboard?.stats?.monthly ?? 0,
      period: '28d',
    },
  ];

  if (initializing) return null;

  return (
    <div className="w-full">
      <FetchAnalytics onAnalyticsUpdate={setAnalytics} />

      <div className="mb-6">
        <h2 className="font-action text-2xl font-bold text-gray-900">
          Analytics Dashboard
          {(analytics.isLoading || analytics.status === 'loading') && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              (Loading data...)
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Comprehensive analytics for your StoryKeep content and user engagement
        </p>
      </div>

      {analytics.error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">
          <h4 className="font-bold">Analytics Error</h4>
          <p>{analytics.error}</p>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {stats.map((item) => {
          const period = item.period;
          let firstTimeValue = 0,
            returningValue = 0;
          switch (period) {
            case '24h':
              firstTimeValue = analytics.dashboard?.dailyAnonymous ?? 0;
              returningValue = analytics.dashboard?.dailyKnown ?? 0;
              break;
            case '7d':
              firstTimeValue = analytics.dashboard?.weeklyAnonymous ?? 0;
              returningValue = analytics.dashboard?.weeklyKnown ?? 0;
              break;
            case '28d':
              firstTimeValue = analytics.dashboard?.monthlyAnonymous ?? 0;
              returningValue = analytics.dashboard?.monthlyKnown ?? 0;
              break;
          }

          return (
            <div
              key={item.period}
              className="rounded-lg border border-gray-100 bg-white px-2 py-2.5 shadow-sm transition-colors hover:border-cyan-100 md:px-4 md:py-3"
            >
              <dt className="text-sm font-bold text-gray-800">{item.name}</dt>

              <dd className="mt-1 md:mt-2">
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">Events</div>
                    <div className="text-2xl font-bold tracking-tight text-cyan-700">
                      {item.events === 0 ? '-' : formatNumber(item.events)}
                    </div>
                  </div>
                </div>
              </dd>

              <hr className="my-1.5 border-gray-100 md:my-3.5" />

              <dd>
                {/* Desktop: side-by-side layout */}
                <div className="hidden items-end justify-between md:flex">
                  <div className="flex-1">
                    <div className="text-sm text-gray-600">
                      Anonymous Visitors
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-cyan-700">
                      {firstTimeValue === 0
                        ? '-'
                        : formatNumber(firstTimeValue)}
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="text-sm text-gray-600">Known Leads</div>
                    <div className="text-2xl font-bold tracking-tight text-cyan-700">
                      {returningValue === 0
                        ? '-'
                        : formatNumber(returningValue)}
                    </div>
                  </div>
                </div>

                {/* Mobile: stacked layout */}
                <div className="md:hidden">
                  <div className="mb-1.5">
                    <div className="text-sm text-gray-600">
                      Anonymous Visitors
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-cyan-700">
                      {firstTimeValue === 0
                        ? '-'
                        : formatNumber(firstTimeValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Known Leads</div>
                    <div className="text-2xl font-bold tracking-tight text-cyan-700">
                      {returningValue === 0
                        ? '-'
                        : formatNumber(returningValue)}
                    </div>
                  </div>
                </div>
              </dd>
            </div>
          );
        })}

        {/* Total Leads Card */}
        <div className="col-span-3 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm transition-colors hover:border-cyan-100">
          <div className="flex items-center justify-between">
            <dt className="text-sm font-bold text-gray-800">Total Leads</dt>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadLeadsCSV}
                disabled={isDownloading}
                className="inline-flex items-center gap-1 rounded bg-cyan-600 px-2 py-1 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-3 w-3" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </div>
          <dd className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-cyan-700">
              {!analytics.leads?.totalLeads || analytics.leads?.totalLeads === 0
                ? '-'
                : formatNumber(analytics.leads?.totalLeads)}
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Registered leads (emails collected)
            </div>
          </dd>
        </div>
      </div>

      {/* Duration Selector */}
      <DurationSelector
        currentDurationHelper={currentDurationHelper}
        setStandardDuration={setStandardDuration}
      />

      {/* Dashboard Activity Chart */}
      <div className="mb-6 overflow-hidden">
        <h3 className="mb-4 text-lg font-bold text-gray-900">
          Activity Over Time
        </h3>
        {analytics.dashboard &&
        analytics.dashboard.line &&
        analytics.dashboard.line.length > 0 ? (
          <DashboardActivity data={analytics.dashboard.line} />
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-lg bg-gray-100">
            <div className="text-center text-gray-500">
              {analytics.isLoading || analytics.status === 'loading' ? (
                <div className="flex flex-col items-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                  <p className="mt-4">Loading activity data...</p>
                </div>
              ) : (
                'No activity data available yet'
              )}
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="my-8">
        <hr className="border-gray-200" />
      </div>

      {/* User Journey Section */}
      <div className="mb-6 overflow-visible">
        <h3 className="mb-4 text-lg font-bold text-gray-900">
          User Journey Analytics
        </h3>

        {analytics.isLoading || analytics.status === 'loading' ? (
          <div className="flex h-96 w-full items-center justify-center rounded bg-gray-100">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-sm text-gray-600">
                Computing user journey data...
              </p>
            </div>
          </div>
        ) : analytics.epinet &&
          analytics.epinet.nodes &&
          analytics.epinet.links ? (
          analytics.epinet.nodes.length > 0 &&
          analytics.epinet.links.length > 0 ? (
            <ErrorBoundary
              fallback={
                <div className="rounded-lg bg-red-50 p-4 text-red-800">
                  Error rendering user flow diagram. Please check the data and
                  try again.
                </div>
              }
            >
              <div className="relative">
                {analytics.status === 'loading' && (
                  <div className="absolute right-0 top-0 rounded bg-white px-2 py-1 text-xs text-gray-500 shadow-sm">
                    Updating...
                  </div>
                )}
                <SankeyDiagram
                  data={{
                    nodes: analytics.epinet.nodes,
                    links: analytics.epinet.links,
                  }}
                  isLoading={
                    analytics.isLoading || analytics.status === 'loading'
                  }
                />
                <EpinetDurationSelector
                  fullContentMap={fullContentMap}
                  isLoading={
                    analytics.isLoading || analytics.status === 'loading'
                  }
                  hourlyNodeActivity={analytics.hourlyNodeActivity}
                  // MODIFICATION: Read availableFilters from the store, not local state
                  availableFilters={$epinetCustomFilters.availableFilters}
                  appliedFilters={$epinetCustomFilters.appliedFilters}
                  onBeliefFilterChange={handleBeliefFilterChange}
                />
              </div>
            </ErrorBoundary>
          ) : (
            <>
              <div className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-800">
                No matching data found with current filters. Try different
                filter settings or time ranges.
              </div>
              <EpinetDurationSelector
                fullContentMap={fullContentMap}
                isLoading={
                  analytics.isLoading || analytics.status === 'loading'
                }
                hourlyNodeActivity={analytics.hourlyNodeActivity}
                // MODIFICATION: Read availableFilters from the store, not local state
                availableFilters={$epinetCustomFilters.availableFilters}
                appliedFilters={$epinetCustomFilters.appliedFilters}
                onBeliefFilterChange={handleBeliefFilterChange}
              />
            </>
          )
        ) : (
          <>
            <div className="rounded-lg bg-gray-50 p-4 text-gray-800">
              User Journey data will appear here once there's visitor activity.
              Check back after some page views have been recorded.
            </div>
            <EpinetDurationSelector
              fullContentMap={fullContentMap}
              isLoading={analytics.isLoading || analytics.status === 'loading'}
              hourlyNodeActivity={analytics.hourlyNodeActivity}
              // MODIFICATION: Read availableFilters from the store, not local state
              availableFilters={$epinetCustomFilters.availableFilters}
              appliedFilters={$epinetCustomFilters.appliedFilters}
              onBeliefFilterChange={handleBeliefFilterChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
