import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import DashboardActivity from "./DashboardActivity";
import SankeyDiagram from "../codehooks/SankeyDiagram";
import EpinetDurationSelector from "../codehooks/EpinetDurationSelector";
import EpinetTableView from "../codehooks/EpinetTableView";
import ArrowDownTrayIcon from "@heroicons/react/24/outline/ArrowDownTrayIcon";
import { epinetCustomFilters } from "../../stores/analytics";
import { classNames } from "../../utils/helpers";

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
  if (num < 1000000) return (num / 1000).toFixed(1) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

export default function PageViewStats() {
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
  const goBackend = import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize epinetCustomFilters on mount
  useEffect(() => {
    epinetCustomFilters.set({
      enabled: true,
      visitorType: 'all',
      selectedUserId: null,
      startHour: 168, // Default to weekly
      endHour: 0,
      userCounts: [],
      hourlyNodeActivity: {},
    });
  }, []);

  // Get current duration based on epinetCustomFilters
  const getCurrentDuration = useCallback((): "daily" | "weekly" | "monthly" => {
    const { startHour } = $epinetCustomFilters;
    if (startHour === 24) return "daily";
    if (startHour === 168) return "weekly";
    if (startHour === 672) return "monthly";
    return "weekly"; // default
  }, [$epinetCustomFilters]);

  // Update epinetCustomFilters based on duration selection
  const updateDuration = (newValue: "daily" | "weekly" | "monthly") => {
    const endHour = 0; // Current hour UTC
    const startHour = newValue === 'daily' ? 24 : newValue === 'weekly' ? 168 : 672;

    epinetCustomFilters.set({
      ...$epinetCustomFilters,
      enabled: true,
      startHour,
      endHour,
    });
  };

  // Fetch all analytics data from V2 /analytics/all endpoint
  const fetchAllAnalytics = useCallback(async () => {
    try {
      setAnalytics(prev => ({ ...prev, isLoading: true, status: 'loading' }));

      const { startHour, endHour, visitorType, selectedUserId } = $epinetCustomFilters;

      // Build URL with epinetCustomFilters parameters
      const url = new URL(`${goBackend}/api/v1/analytics/all`);
      if (startHour !== null) url.searchParams.append('startHour', startHour.toString());
      if (endHour !== null) url.searchParams.append('endHour', endHour.toString());
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

      setAnalytics(prev => ({
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
      epinetCustomFilters.set({
        ...$epinetCustomFilters,
        userCounts: data.userCounts || [],
        hourlyNodeActivity: data.hourlyNodeActivity || {},
      });

    } catch (error) {
      console.error('Analytics fetch error:', error);
      setAnalytics(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
      }));
    } finally {
      setAnalytics(prev => ({ ...prev, isLoading: false }));
    }
  }, [$epinetCustomFilters, goBackend]);

  // Fetch analytics when epinetCustomFilters change OR on initial load
  useEffect(() => {
    if ($epinetCustomFilters.startHour !== null &&
      $epinetCustomFilters.endHour !== null) {
      fetchAllAnalytics();
    }
  }, [$epinetCustomFilters.startHour, $epinetCustomFilters.endHour, $epinetCustomFilters.visitorType, $epinetCustomFilters.selectedUserId]);

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

  const DurationSelector = () => {
    const currentDuration = getCurrentDuration();

    return (
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-sm mt-6 mb-4">
        <span className="font-action text-gray-800 font-bold">Filter analytics:</span>
        {["daily", "weekly", "monthly"].map((period) => (
          <button
            key={period}
            onClick={() => updateDuration(period as "daily" | "weekly" | "monthly")}
            className={classNames(
              "px-3 py-1 rounded-full transition-all duration-200 ease-in-out",
              currentDuration === period
                ? "bg-cyan-600 text-white font-bold shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-cyan-100 hover:text-cyan-800"
            )}
          >
            {period === "daily" ? "24 hours" : period === "weekly" ? "7 days" : "4 weeks"}
          </button>
        ))}
      </div>
    );
  };

  if (!isClient) return null;

  const stats: Stat[] = [
    {
      name: "Last 24 Hours",
      events: analytics.dashboard?.stats?.daily ?? 0,
      period: "24h",
    },
    {
      name: "Past 7 Days",
      events: analytics.dashboard?.stats?.weekly ?? 0,
      period: "7d",
    },
    {
      name: "Past 28 Days",
      events: analytics.dashboard?.stats?.monthly ?? 0,
      period: "28d",
    },
  ];

  return (
    <div id="analytics" className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">
          Analytics Dashboard
          {(analytics.isLoading || analytics.status === "loading") && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              (Loading data...)
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {stats.map((item) => {
            const period = item.period;
            const firstTimeValue = analytics.leads?.[`first_time_${period}`] ?? 0;
            const returningValue = analytics.leads?.[`returning_${period}`] ?? 0;
            const firstTimePercentage = analytics.leads?.[`first_time_${period}_percentage`] ?? 0;
            const returningPercentage = analytics.leads?.[`returning_${period}_percentage`] ?? 0;

            return (
              <div
                key={item.period}
                className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors"
              >
                <dt className="text-sm font-bold text-gray-800">{item.name}</dt>

                <dd className="mt-2">
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Events</div>
                      <div className="text-2xl font-bold tracking-tight text-cyan-700">
                        {item.events === 0 ? "-" : formatNumber(item.events)}
                      </div>
                    </div>
                  </div>
                </dd>

                <hr className="my-3.5 border-gray-100" />

                <dd>
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Anonymous Visitors</div>
                      <div className="text-2xl font-bold tracking-tight text-cyan-700">
                        {firstTimeValue === 0 ? "-" : formatNumber(firstTimeValue)}
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-sm text-gray-600">Known Leads</div>
                      <div className="text-2xl font-bold tracking-tight text-cyan-700">
                        {returningValue === 0 ? "-" : formatNumber(returningValue)}
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 mb-1 overflow-hidden">
                    <div
                      className="bg-cyan-600 h-2.5 float-left"
                      style={{ width: `${firstTimePercentage}%` }}
                    />
                    <div
                      className="bg-cyan-300 h-2.5 float-left"
                      style={{ width: `${returningPercentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>{firstTimePercentage.toFixed(1)}% Anonymous</span>
                    <span>{returningPercentage.toFixed(1)}% Known</span>
                  </div>
                </dd>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Leads panel */}
          <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors relative">
            <div className="flex justify-between items-start">
              <dt className="text-sm font-bold text-gray-800">Total Leads</dt>
              {analytics.leads && analytics.leads.total_leads > 0 && (
                <button
                  onClick={downloadLeadsCSV}
                  disabled={isDownloading}
                  title="Download leads report"
                  className="flex items-center text-xs text-blue-600 hover:text-orange-600 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                  {isDownloading ? "Downloading..." : "Download"}
                </button>
              )}
            </div>
            <dd className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-cyan-700">
                {analytics.leads?.total_leads === 0
                  ? "-"
                  : formatNumber(analytics.leads?.total_leads || 0)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Registered leads (emails collected)
              </div>
            </dd>
          </div>
        </div>

        <div className="px-4">
          <DurationSelector />

          {/* Dashboard Activity Chart */}
          {analytics.dashboard && analytics.dashboard.line && analytics.dashboard.line.length > 0 ? (
            <DashboardActivity data={analytics.dashboard.line} duration={getCurrentDuration()} />
          ) : (
            <div className="h-64 bg-gray-100 rounded-lg w-full mb-6 flex items-center justify-center">
              <div className="text-center text-gray-500">
                {analytics.isLoading || analytics.status === "loading" ? (
                  <div className="flex flex-col items-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                    <p className="mt-4">Loading activity data...</p>
                  </div>
                ) : (
                  "No activity data available yet"
                )}
              </div>
            </div>
          )}

          <div className="pt-6">
            <hr />
          </div>

          {/* Epinet Sankey Diagram */}
          {analytics.isLoading || analytics.status === "loading" ? (
            <div className="h-96 bg-gray-100 rounded w-full flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-4 text-sm text-gray-600">Computing user journey data...</p>
              </div>
            </div>
          ) : analytics.epinet && analytics.epinet.nodes && analytics.epinet.links ? (
            analytics.epinet.nodes.length > 0 && analytics.epinet.links.length > 0 ? (
              <ErrorBoundary
                fallback={
                  <div className="p-4 bg-red-50 text-red-800 rounded-lg">
                    Error rendering user flow diagram. Please check the data and try again.
                  </div>
                }
              >
                <div className="relative">
                  {analytics.status === "loading" && (
                    <div className="absolute top-0 right-0 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
                      Updating...
                    </div>
                  )}
                  <SankeyDiagram data={{ nodes: analytics.epinet.nodes, links: analytics.epinet.links }} />
                  <EpinetDurationSelector />
                  <EpinetTableView fullContentMap={[]} />
                </div>
              </ErrorBoundary>
            ) : (
              <>
                <div className="p-4 bg-gray-50 text-gray-800 rounded-lg mt-4">
                  No matching data found with current filters. Try different filter settings or time
                  ranges.
                </div>
                <EpinetDurationSelector />
                <EpinetTableView fullContentMap={[]} />
              </>
            )
          ) : (
            <div className="p-4 bg-gray-50 text-gray-800 rounded-lg mt-4">
              No user journey data is available yet. This visualization will appear when users start
              interacting with your content.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
