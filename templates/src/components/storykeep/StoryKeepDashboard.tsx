import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { epinetCustomFilters } from '../../stores/analytics';
import { classNames } from '../../utils/helpers';
import type { FullContentMapItem } from 'templates/src/types/tractstack';

// Import the analytics component
import StoryKeepDashboard_Analytics from './StoryKeepDashboard_Analytics';
import StoryKeepDashboard_Content from './StoryKeepDashboard_Content';

// Tab configuration
interface Tab {
  id: string;
  name: string;
  current: boolean;
}

const tabs: Tab[] = [
  { id: 'analytics', name: 'Analytics', current: true },
  { id: 'content', name: 'Content', current: false },
  { id: 'settings', name: 'Settings', current: false },
];

export default function StoryKeepDashboard({
  fullContentMap,
  homeSlug,
}: {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
}) {
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('analytics');

  // Use ref to track initialization state
  const isInitialized = useRef<boolean>(false);
  const isInitializing = useRef<boolean>(false);

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

  // Duration helper for UI - EXACTLY as original
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

  // Standard duration setter helper - EXACTLY as original
  const setStandardDuration = useCallback(
    (newValue: 'daily' | 'weekly' | 'monthly') => {
      const nowUTC = new Date();
      const hoursBack: number =
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
    },
    [$epinetCustomFilters]
  );

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

  // CONSOLIDATED INITIALIZATION: Initialize filters once on mount
  useEffect(() => {
    if (!isInitialized.current && !isInitializing.current) {
      isInitializing.current = true;

      const nowUTC = new Date();
      const oneWeekAgoUTC = new Date(
        nowUTC.getTime() - 7 * 24 * 60 * 60 * 1000
      );

      epinetCustomFilters.set({
        enabled: true,
        visitorType: 'all',
        selectedUserId: null,
        startTimeUTC: oneWeekAgoUTC.toISOString(),
        endTimeUTC: nowUTC.toISOString(),
        userCounts: [],
        hourlyNodeActivity: {},
      });

      isInitialized.current = true;
      isInitializing.current = false;
    }
  }, []);

  // REACTIVE FETCH: Only fetch when filters change AFTER initialization
  useEffect(() => {
    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;

    // Only fetch if we're initialized and have valid date range
    if (isInitialized.current && startTimeUTC && endTimeUTC) {
      fetchAllAnalytics();
    }
  }, [
    $epinetCustomFilters.startTimeUTC,
    $epinetCustomFilters.endTimeUTC,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
    fetchAllAnalytics,
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

  // Handle tab switching
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Render placeholder content for other tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics':
        return (
          <StoryKeepDashboard_Analytics
            analytics={analytics}
            fullContentMap={fullContentMap}
            onDownloadExcel={downloadLeadsCSV}
            isDownloading={isDownloading}
            currentDurationHelper={currentDurationHelper}
            setStandardDuration={setStandardDuration}
          />
        );
      case 'content':
        return (
          <StoryKeepDashboard_Content
            analytics={analytics}
            fullContentMap={fullContentMap}
            homeSlug={homeSlug}
          />
        );
      case 'settings':
        return (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="mt-4 text-gray-600">
              Settings panel will be available here soon.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-action text-3xl font-bold tracking-tight text-gray-900">
          StoryKeep Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your content, users, and analytics in one place
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-x-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={classNames(
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
