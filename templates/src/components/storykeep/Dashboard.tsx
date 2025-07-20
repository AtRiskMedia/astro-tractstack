import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { epinetCustomFilters } from '@/stores/analytics';
import { brandConfigStore, getBrandConfig } from '@/stores/brand';
import { navigationActions } from '@/stores/navigation';
import { classNames } from '@/utils/helpers';
import { TractStackAPI } from '@/utils/api';
import StoryKeepDashboard_Wizard from './Dashboard_Wizard';
import StoryKeepDashboard_Analytics from './Dashboard_Analytics';
import StoryKeepDashboard_Content from './Dashboard_Content';
import StoryKeepDashboard_Branding from './Dashboard_Branding';
import StoryKeepDashboard_Advanced from './Dashboard_Advanced';
import type { FullContentMapItem } from '@/types/tractstack';

interface Tab {
  id: string;
  name: string;
  current: boolean;
}

export default function StoryKeepDashboard({
  fullContentMap,
  homeSlug,
  initialTab = 'analytics',
  role,
  initializing = false,
}: {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
  initialTab?: string;
  role?: string | null;
  initializing?: boolean;
}) {
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const $brandConfig = useStore(brandConfigStore);

  const isCurrentlyInitializing = initializing && !$brandConfig?.SITE_INIT;
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Override activeTab when in initialization mode
  const currentActiveTab = isCurrentlyInitializing ? 'branding' : activeTab;

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

  // Get backend URL
  const goBackend =
    import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';

  // Define tabs - show only branding when initializing
  const tabs: Tab[] = isCurrentlyInitializing
    ? [{ id: 'branding', name: 'Welcome to your StoryKeep', current: true }]
    : [
        {
          id: 'analytics',
          name: 'Analytics',
          current: currentActiveTab === 'analytics',
        },
        {
          id: 'content',
          name: 'Content',
          current: currentActiveTab === 'content',
        },
        {
          id: 'branding',
          name: 'Branding',
          current: currentActiveTab === 'branding',
        },
        ...(role === 'admin'
          ? [
              {
                id: 'advanced',
                name: 'Advanced',
                current: currentActiveTab === 'advanced',
              },
            ]
          : []),
      ];

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

    return 'monthly'; // default
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

      epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
        ...$epinetCustomFilters,
        enabled: true,
        startTimeUTC: startTimeUTC.toISOString(),
        endTimeUTC: nowUTC.toISOString(),
      });
    },
    [$epinetCustomFilters]
  );

  // Fetch all analytics data
  const fetchAllAnalytics = useCallback(async () => {
    try {
      setAnalytics((prev) => ({ ...prev, isLoading: true, status: 'loading' }));

      const { startTimeUTC, endTimeUTC, visitorType, selectedUserId } =
        $epinetCustomFilters;

      // Build URL parameters for TractStackAPI
      const params = new URLSearchParams();

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

        params.append('startHour', startHour.toString());
        params.append('endHour', endHour.toString());
      }

      if (visitorType) params.append('visitorType', visitorType);
      if (selectedUserId) params.append('userId', selectedUserId);

      // Use TractStackAPI instead of raw fetch
      const api = new TractStackAPI(
        window.TRACTSTACK_CONFIG?.tenantId || 'default'
      );
      const endpoint = `/api/v1/analytics/all${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch analytics data');
      }

      const data = response.data;

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
      epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
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
        isLoading: false,
      }));
    } finally {
      setAnalytics((prev) => ({ ...prev, isLoading: false }));
    }
  }, [$epinetCustomFilters]);

  // Load brand config when branding tab is accessed
  useEffect(() => {
    if (currentActiveTab === 'branding' && !$brandConfig) {
      getBrandConfig(window.TRACTSTACK_CONFIG?.tenantId || 'default');
    }
  }, [currentActiveTab, $brandConfig, goBackend]);

  // URL restoration
  useEffect(() => {
    if (
      !isInitialized.current &&
      !isInitializing.current &&
      !isCurrentlyInitializing
    ) {
      isInitializing.current = true;

      // Check URL for initial tab and update navigation store
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTab = Array.from(urlParams.keys())[0]; // Get first param key (analytics, content, etc.)
        const validTabs = [
          'analytics',
          'content',
          'branding',
          ...(role === 'admin' ? ['advanced'] : []),
        ];

        if (urlTab && validTabs.includes(urlTab)) {
          setActiveTab(urlTab);
          navigationActions.setMainTab(urlTab as any, false);
        }
      }

      const nowUTC = new Date();
      const oneMonthAgoUTC = new Date(
        nowUTC.getTime() - 28 * 24 * 60 * 60 * 1000
      );

      epinetCustomFilters.set(window.TRACTSTACK_CONFIG?.tenantId || 'default', {
        enabled: true,
        visitorType: 'all',
        selectedUserId: null,
        startTimeUTC: oneMonthAgoUTC.toISOString(),
        endTimeUTC: nowUTC.toISOString(),
        userCounts: [],
        hourlyNodeActivity: {},
      });

      isInitialized.current = true;
      isInitializing.current = false;
    }
  }, [role, isCurrentlyInitializing]);

  // REACTIVE FETCH: Only fetch when filters change AFTER initialization - EXACTLY as original
  useEffect(() => {
    const { startTimeUTC, endTimeUTC } = $epinetCustomFilters;

    // Only fetch if we're initialized and have valid date range
    if (
      isInitialized.current &&
      startTimeUTC &&
      endTimeUTC &&
      !isCurrentlyInitializing
    ) {
      fetchAllAnalytics();
    }
  }, [
    $epinetCustomFilters.startTimeUTC,
    $epinetCustomFilters.endTimeUTC,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
    isCurrentlyInitializing,
  ]);

  // Download leads CSV (placeholder - adapt to V2 endpoint) - EXACTLY as original
  const downloadLeadsCSV = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      // TODO: Implement V at 2 leads download endpoint
      alert('Leads download not yet implemented for V2');
    } catch (error) {
      console.error('Error downloading leads:', error);
      alert('Failed to download leads. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle tab switching - ONLY CHANGE: Add URL update and navigation tracking
  const handleTabChange = (tabId: string) => {
    if (isCurrentlyInitializing) return; // Prevent tab changes during initialization

    setActiveTab(tabId);

    // Add URL update - preserve original ?content pattern
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.search = `?${tabId}`;
      window.history.pushState({}, '', url.toString());
    }

    // Add navigation tracking
    navigationActions.setMainTab(tabId as any, false);
  };

  // Render placeholder content for other tabs - EXACTLY as original
  const renderTabContent = () => {
    switch (currentActiveTab) {
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
      case 'branding':
        return $brandConfig ? (
          <StoryKeepDashboard_Branding brandConfig={$brandConfig} />
        ) : (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <div className="text-lg text-gray-600">
              Loading brand configuration...
            </div>
          </div>
        );
      case 'advanced':
        return role === 'admin' ? <StoryKeepDashboard_Advanced /> : null;
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
      {isCurrentlyInitializing && (
        <div className="mb-8 rounded-md border border-dashed border-orange-200 bg-orange-50 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">⭐</span>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-black">
                Welcome to your StoryKeep
              </h3>
              <div className="text-mydarkgrey mt-2 text-sm">
                <p>
                  Complete your site's branding configuration to get started.
                  (And update as often as you like!)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <StoryKeepDashboard_Wizard
        fullContentMap={fullContentMap}
        homeSlug={homeSlug}
      />

      {/* Tab Navigation */}
      {!isCurrentlyInitializing && (
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-x-4" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={classNames(
                    currentActiveTab === tab.id
                      ? 'border-cyan-500 text-cyan-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                    'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-bold'
                  )}
                  aria-current={
                    currentActiveTab === tab.id ? 'page' : undefined
                  }
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="xl:max-w-5xl">{renderTabContent()}</div>
    </div>
  );
}
