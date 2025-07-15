import { useState } from 'react';
import { classNames } from '../../utils/helpers';
import ContentBrowser from './controls/content/ContentBrowser';
import ManageContent from './controls/content/ManageContent';
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

interface ContentTab {
  id: string;
  name: string;
}

const contentTabs: ContentTab[] = [
  { id: 'webpages', name: 'Web Pages' },
  { id: 'manage', name: 'Manage Content' },
];

const StoryKeepDashboard_Content = ({
  analytics,
  fullContentMap,
  homeSlug,
}: StoryKeepDashboardContentProps) => {
  const [activeContentTab, setActiveContentTab] = useState('webpages');

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
                onClick={() => setActiveContentTab(tab.id)}
                className={classNames(
                  activeContentTab === tab.id
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium'
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
