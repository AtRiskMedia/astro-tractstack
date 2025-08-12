import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '@/utils/helpers';
import { TractStackAPI } from '@/utils/api';
import {
  contentNavigationStore,
  handleContentSubtabChange,
  restoreTabNavigation,
} from '@/stores/navigation';
import ContentBrowser from './controls/content/ContentBrowser';
import ManageContent from './controls/content/ManageContent';
import type { FullContentMapItem } from '@/types/tractstack';

interface StoryKeepDashboardContentProps {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
}

interface ContentTab {
  id: string;
  name: string;
}

const contentTabs: ContentTab[] = [
  { id: 'webpages', name: 'Web Pages' },
  { id: 'manage', name: 'Manage Content' },
];

const StoryKeepDashboard_Content = ({
  fullContentMap,
  homeSlug,
}: StoryKeepDashboardContentProps) => {
  const [activeContentTab, setActiveContentTab] = useState('webpages');
  const [navigationRestored, setNavigationRestored] = useState(false);

  // Lightweight analytics data state - only for hotContent
  const [analytics, setAnalytics] = useState<{
    dashboard: {
      hotContent?: Array<{ id: string; totalEvents: number }>;
    } | null;
    isLoading: boolean;
    status: string;
    error: string | null;
  }>({
    dashboard: null,
    isLoading: false,
    status: 'idle',
    error: null,
  });

  // Subscribe to navigation store
  const contentNavigationState = useStore(contentNavigationStore);

  // Restore navigation state when component mounts or when returning to Content tab
  useEffect(() => {
    if (!navigationRestored) {
      const contentNavigation = restoreTabNavigation();
      if (contentNavigation) {
        setActiveContentTab(contentNavigation.subtab);
      }
      setNavigationRestored(true);
    }
  }, [navigationRestored]);

  // Enhanced content tab change with navigation tracking
  const handleContentTabChange = (tabId: string) => {
    handleContentSubtabChange(tabId as any, setActiveContentTab);
  };

  // Lightweight content summary fetch with retry logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 2;

    const fetchContentSummary = async () => {
      try {
        setAnalytics((prev) => ({ ...prev, isLoading: true, error: null }));

        // Use TractStackAPI like FetchAnalytics does
        const api = new TractStackAPI(
          window.TRACTSTACK_CONFIG?.tenantId || 'default'
        );

        const response = await api.get('/api/v1/analytics/content-summary');

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch content summary');
        }

        const data = response.data;

        // Check if we got actual data
        const hasData = data.hotContent && data.hotContent.length > 0;

        setAnalytics({
          dashboard: { hotContent: data.hotContent || [] },
          isLoading: false,
          status: hasData ? 'complete' : 'empty',
          error: null,
        });

        // If no data and we have retries left, try again after delay
        if (!hasData && retryCount < maxRetries) {
          retryCount++;
          const delayMs = retryCount === 1 ? 3000 : 6000; // 3s, then 6s
          setTimeout(fetchContentSummary, delayMs);
        }
      } catch (error) {
        console.error('Content summary fetch error:', error);

        // If we have retries left, try again
        if (retryCount < maxRetries) {
          retryCount++;
          const delayMs = retryCount === 1 ? 3000 : 6000;
          setAnalytics((prev) => ({
            ...prev,
            isLoading: false,
            status: 'retrying',
            error: `Attempt ${retryCount} failed, retrying in ${delayMs / 1000}s...`,
          }));
          setTimeout(fetchContentSummary, delayMs);
        } else {
          // Max retries reached
          setAnalytics({
            dashboard: { hotContent: [] },
            isLoading: false,
            status: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load content analytics',
          });
        }
      }
    };

    fetchContentSummary();
  }, []);

  const renderContentTabContent = () => {
    switch (activeContentTab) {
      case 'webpages':
        return (
          <ContentBrowser
            analytics={analytics}
            fullContentMap={fullContentMap}
            homeSlug={homeSlug}
          />
        );
      case 'manage':
        return (
          <ManageContent fullContentMap={fullContentMap} homeSlug={homeSlug} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Content Sub-Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-x-6" aria-label="Content tabs">
            {contentTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleContentTabChange(tab.id)}
                className={classNames(
                  activeContentTab === tab.id
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap border-b-2 px-1 py-3 text-sm font-bold'
                )}
                aria-current={activeContentTab === tab.id ? 'page' : undefined}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Tab Content */}
      {renderContentTabContent()}
    </div>
  );
};

export default StoryKeepDashboard_Content;
