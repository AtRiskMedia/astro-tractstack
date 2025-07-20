import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '@/utils/helpers';
import {
  contentNavigationStore,
  handleContentSubtabChange,
  restoreTabNavigation,
} from '@/stores/navigation';
import ContentBrowser from './controls/content/ContentBrowser';
import ManageContent from './controls/content/ManageContent';
import FetchAnalytics from './FetchAnalytics';
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
      <FetchAnalytics onAnalyticsUpdate={setAnalytics} />

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
