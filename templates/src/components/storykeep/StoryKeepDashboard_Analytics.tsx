import { useState, useMemo, type ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import ArrowDownTrayIcon from '@heroicons/react/24/outline/ArrowDownTrayIcon';
import DashboardActivity from './DashboardActivity';
import SankeyDiagram from '../codehooks/SankeyDiagram';
import EpinetDurationSelector from '../codehooks/EpinetDurationSelector';
import EpinetTableView from '../codehooks/EpinetTableView';
import { epinetCustomFilters } from '../../stores/analytics';
import { classNames } from '../../utils/helpers';
import type { FullContentMapItem } from 'templates/src/types/tractstack';

interface AnalyticsData {
  dashboard: any;
  leads: any;
  epinet: any;
  userCounts: any[];
  hourlyNodeActivity: any;
  isLoading: boolean;
  status: string;
  error: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface StoryKeepDashboardAnalyticsProps {
  analytics: AnalyticsData;
  fullContentMap: FullContentMapItem[];
  onDownloadExcel: () => void;
  isDownloading: boolean;
  currentDurationHelper: 'daily' | 'weekly' | 'monthly' | 'custom';
  setStandardDuration: (newValue: 'daily' | 'weekly' | 'monthly') => void;
}

const ErrorBoundary = ({ children, fallback }: ErrorBoundaryProps) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) return <>{fallback}</>;

  return (
    <div onError={() => setHasError(true)} style={{ display: 'contents' }}>
      {children}
    </div>
  );
};

function formatNumber(num: number): string {
  if (num < 10000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  return (num / 1000000).toFixed(2) + 'M';
}

const DurationSelector = ({
  currentDurationHelper,
  setStandardDuration,
}: {
  currentDurationHelper: 'daily' | 'weekly' | 'monthly' | 'custom';
  setStandardDuration: (newValue: 'daily' | 'weekly' | 'monthly') => void;
}) => {
  return (
    <div className="mb-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
      <span className="font-action font-bold text-gray-800">
        Analytics period:
      </span>
      {[
        { label: '24 hours', value: 'daily' },
        { label: '7 days', value: 'weekly' },
        { label: '4 weeks', value: 'monthly' },
      ].map((period) => (
        <button
          key={period.value}
          onClick={() =>
            setStandardDuration(period.value as 'daily' | 'weekly' | 'monthly')
          }
          className={classNames(
            'rounded-full px-3 py-1 transition-all duration-200 ease-in-out',
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
  analytics,
  fullContentMap,
  onDownloadExcel,
  isDownloading,
  currentDurationHelper,
  setStandardDuration,
}: StoryKeepDashboardAnalyticsProps) {
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

  return (
    <div className="w-full">
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
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((item) => {
          const period = item.period;
          const firstTimeValue = analytics.leads?.[`first_time_${period}`] ?? 0;
          const returningValue = analytics.leads?.[`returning_${period}`] ?? 0;
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
              </dd>
            </div>
          );
        })}

        {/* Total Leads Card */}
        <div className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm transition-colors hover:border-cyan-100 md:col-span-3">
          <div className="flex items-center justify-between">
            <dt className="text-sm font-bold text-gray-800">Total Leads</dt>
            <div className="flex items-center gap-2">
              {onDownloadExcel && (
                <button
                  onClick={onDownloadExcel}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1 rounded bg-cyan-600 px-2 py-1 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="h-3 w-3" />
                  {isDownloading ? 'Downloading...' : 'Download'}
                </button>
              )}
            </div>
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

      {/* Duration Selector */}
      <DurationSelector
        currentDurationHelper={currentDurationHelper}
        setStandardDuration={setStandardDuration}
      />

      {/* Dashboard Activity Chart */}
      <div className="mb-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
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
      <div className="mb-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
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
                />
                <EpinetDurationSelector />
                <EpinetTableView fullContentMap={fullContentMap} />
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
  );
}
