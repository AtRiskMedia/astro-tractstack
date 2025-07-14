import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useStore } from '@nanostores/react';
import DashboardActivity from './DashboardActivity';
import SankeyDiagram from '../codehooks/SankeyDiagram';
import EpinetDurationSelector from '../codehooks/EpinetDurationSelector';
import EpinetTableView from '../codehooks/EpinetTableView';
import ArrowDownTrayIcon from '@heroicons/react/24/outline/ArrowDownTrayIcon';
import { epinetCustomFilters } from '../../stores/analytics';
import { classNames } from '../../utils/helpers';

interface Stat {
  name: string;
  events: number;
  period: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

const ErrorBoundary = ({ children, fallback }: ErrorBoundaryProps) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (hasError) return <>{fallback}</>;

  return <div onError={handleError}>{children}</div>;
};

function formatNumber(num: number): string {
  if (num < 10000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  return (num / 1000000).toFixed(2) + 'M';
}

export default function StoryKeepDashboard() {
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

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

  const $epinetCustomFilters = useStore(epinetCustomFilters);

  // Get backend URL
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize epinetCustomFilters on mount with UTC timestamps
  useEffect(() => {
    const nowUTC = new Date();
    const oneWeekAgoUTC = new Date(nowUTC.getTime() - 7 * 24 * 60 * 60 * 1000);

    epinetCustomFilters.set({
      enabled: true,
      visitorType: 'all',
      selectedUserId: null,
      startTimeUTC: oneWeekAgoUTC.toISOString(),
      endTimeUTC: nowUTC.toISOString(),
      userCounts: [],
      hourlyNodeActivity: {},
    });
  }, []);

  // Detect current duration type from epinetCustomFilters (for UI helpers only)
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

    return 'weekly'; // default
  }, [$epinetCustomFilters.startTimeUTC, $epinetCustomFilters.endTimeUTC]);

  // UI helper functions to set standard ranges (UTC)
  const setStandardDuration = (newValue: 'daily' | 'weekly' | 'monthly') => {
    const nowUTC = new Date();
    const hoursBack =
      newValue === 'daily' ? 24 : newValue === 'weekly' ? 168 : 672;
    const startTimeUTC = new Date(
      nowUTC.getTime() - hoursBack * 60 * 60 * 1000
    );

    epinetCustomFilters.set({
      ...$epinetCustomFilters,
      enabled: true,
      startTimeUTC: startTimeUTC.toISOString(),
      endTimeUTC: nowUTC.toISOString(),
    });
  };

  // Fetch all analytics data from V2 /analytics/all endpoint
  const fetchAllAnalytics = useCallback(async () => {
    try {
      setAnalytics((prev) => ({ ...prev, isLoading: true, status: 'loading' }));

      const { startTimeUTC, endTimeUTC, visitorType, selectedUserId } =
        $epinetCustomFilters;

      // Build URL with epinetCustomFilters parameters (UTC)
      const url = new URL(`${goBackend}/api/v1/analytics/all`);

      if (startTimeUTC && endTimeUTC) {
        // Convert UTC timestamps to hours-back integers (what backend expects)
        const now = new Date();
        const startTime = new Date(startTimeUTC);
        const endTime = new Date(endTimeUTC);

        const startHour = Math.ceil(
          (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        );
        const endHour = Math.floor(
          (now.getTime() - endTime.getTime()) / (1000 * 60 * 60)
        );

        url.searchParams.append('startHour', startHour.toString());
        url.searchParams.append('endHour', endHour.toString());
      }

      if (visitorType) url.searchParams.append('visitorType', visitorType);
      if (selectedUserId) url.searchParams.append('userId', selectedUserId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();

      setAnalytics((prev) => ({
        ...prev,
        dashboard: data.dashboard,
        leads: data.leads,
        epinet: data.epinet,
        userCounts: data.userCounts || [],
        hourlyNodeActivity: data.hourlyNodeActivity || {},
        status: 'complete',
        error: null,
      }));

      // Update epinetCustomFilters with additional data from response
      const current = epinetCustomFilters.get();
      epinetCustomFilters.set({
        ...current,
        userCounts: data.userCounts || [],
        hourlyNodeActivity: data.hourlyNodeActivity || {},
      });
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setAnalytics((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      }));
    } finally {
      setAnalytics((prev) => ({ ...prev, isLoading: false }));
    }
  }, [
    $epinetCustomFilters.startTimeUTC,
    $epinetCustomFilters.endTimeUTC,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
    goBackend,
  ]);

  // Fetch analytics when epinetCustomFilters change OR on initial load
  useEffect(() => {
    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;

    if (startTimeUTC && endTimeUTC) {
      fetchAllAnalytics();
    }
  }, [
    $epinetCustomFilters.startTimeUTC,
    $epinetCustomFilters.endTimeUTC,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
  ]);

  // Download leads CSV (placeholder - adapt to V2 endpoint)
  const downloadLeadsCSV = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      // TODO: Implement V2 leads download endpoint
      alert('Leads download not yet implemented for V2');
    } catch (error) {
      console.error('Error downloading leads:', error);
      alert('Failed to download leads. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Duration selector UI helpers (remain active for reset functionality)
  const DurationSelector = () => {
    return (
      <div className="mb-4 mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
        <span className="font-action font-bold text-gray-800">
          Filter analytics:
        </span>
        {['daily', 'weekly', 'monthly'].map((period) => (
          <button
            key={period}
            onClick={() =>
              setStandardDuration(period as 'daily' | 'weekly' | 'monthly')
            }
            className={classNames(
              'rounded-full px-3 py-1 transition-all duration-200 ease-in-out',
              currentDurationHelper === period
                ? 'bg-cyan-600 font-bold text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-cyan-100 hover:text-cyan-800'
            )}
          >
            {period === 'daily'
              ? '24 hours'
              : period === 'weekly'
                ? '7 days'
                : '4 weeks'}
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

  if (!isClient) return null;

  const stats: Stat[] = [
    {
      name: 'Last 24 Hours',
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

  return (
    <div id="analytics" className="p-0.5 shadow-md">
      <div className="w-full rounded-b-md bg-white p-1.5">
        <h3 className="font-action mb-4 text-xl font-bold">
          Analytics Dashboard
          {(analytics.isLoading || analytics.status === 'loading') && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              (Loading data...)
            </span>
          )}
        </h3>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((item) => {
            const period = item.period;
            const firstTimeValue =
              analytics.leads?.[`first_time_${period}`] ?? 0;
            const returningValue =
              analytics.leads?.[`returning_${period}`] ?? 0;
            const firstTimePercentage =
              analytics.leads?.[`first_time_${period}_percentage`] ?? 0;
            const returningPercentage =
              analytics.leads?.[`returning_${period}_percentage`] ?? 0;

            return (
              <div
                key={item.period}
                className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm transition-colors hover:border-cyan-100"
              >
                <dt className="text-sm font-bold text-gray-800">{item.name}</dt>

                <dd className="mt-2">
                  <div className="flex items-end justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Events</div>
                      <div className="text-2xl font-bold tracking-tight text-cyan-700">
                        {item.events === 0 ? '-' : formatNumber(item.events)}
                      </div>
                    </div>
                  </div>
                </dd>

                <hr className="my-3.5 border-gray-100" />

                <dd>
                  <div className="flex items-end justify-between">
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

                  <div className="mb-1 mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="float-left h-2.5 bg-cyan-600"
                      style={{ width: `${firstTimePercentage}%` }}
                    />
                    <div
                      className="float-left h-2.5 bg-cyan-300"
                      style={{ width: `${returningPercentage}%` }}
                    />
                  </div>

                  <div className="mt-1 flex justify-between text-xs text-gray-600">
                    <span>{firstTimePercentage.toFixed(1)}% Anonymous</span>
                    <span>{returningPercentage.toFixed(1)}% Known</span>
                  </div>
                </dd>
              </div>
            );
          })}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Leads panel */}
          <div className="relative rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm transition-colors hover:border-cyan-100">
            <div className="flex items-start justify-between">
              <dt className="text-sm font-bold text-gray-800">Total Leads</dt>
              {analytics.leads && analytics.leads.total_leads > 0 && (
                <button
                  onClick={downloadLeadsCSV}
                  disabled={isDownloading}
                  title="Download leads report"
                  className="flex items-center text-xs text-blue-600 transition-colors hover:text-orange-600"
                >
                  <ArrowDownTrayIcon className="mr-1 h-4 w-4" />
                  {isDownloading ? 'Downloading...' : 'Download'}
                </button>
              )}
            </div>
            <dd className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-cyan-700">
                {analytics.leads?.total_leads === 0
                  ? '-'
                  : formatNumber(analytics.leads?.total_leads || 0)}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Registered leads (emails collected)
              </div>
            </dd>
          </div>
        </div>

        <div className="px-4">
          <DurationSelector />

          {/* Dashboard Activity Chart */}
          {analytics.dashboard &&
            analytics.dashboard.line &&
            analytics.dashboard.line.length > 0 ? (
            <DashboardActivity data={analytics.dashboard.line} />
          ) : (
            <div className="mb-6 flex h-64 w-full items-center justify-center rounded-lg bg-gray-100">
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

          <div className="pt-6">
            <hr />
          </div>

          {/* Epinet Sankey Diagram */}
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
                  />
                  <EpinetDurationSelector />
                  <EpinetTableView fullContentMap={[]} />
                </div>
              </ErrorBoundary>
            ) : (
              <>
                <div className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-800">
                  No matching data found with current filters. Try different
                  filter settings or time ranges.
                </div>
                <EpinetDurationSelector />
                <EpinetTableView fullContentMap={[]} />
              </>
            )
          ) : (
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-800">
              No user journey data is available yet. This visualization will
              appear when users start interacting with your content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
