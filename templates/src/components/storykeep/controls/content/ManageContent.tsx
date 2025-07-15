import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '../../../../utils/helpers';
import { navigationStore } from '../../../../stores/navigation';
import {
  handleManageSubtabChange,
  restoreTabNavigation,
} from '../../../../utils/navigationHelpers';
import ContentSummary from './ContentSummary';
import StoryFragmentTable from './StoryFragmentTable';
import type { FullContentMapItem } from '../../../../types/tractstack';

interface ManageContentProps {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
}

interface ContentManagementTab {
  id: string;
  name: string;
}

const contentManagementTabs: ContentManagementTab[] = [
  { id: 'summary', name: 'Summary' },
  { id: 'storyfragments', name: 'Story Fragments' },
  { id: 'panes', name: 'Panes' },
  { id: 'menus', name: 'Menus' },
  { id: 'resources', name: 'Resources' },
  { id: 'beliefs', name: 'Beliefs' },
  { id: 'epinets', name: 'Epinets' },
  { id: 'files', name: 'Files' },
];

const ManageContent = ({ fullContentMap, homeSlug }: ManageContentProps) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [navigationRestored, setNavigationRestored] = useState(false);

  // Subscribe to navigation store
  const navigationState = useStore(navigationStore);

  // Restore navigation state when component mounts (when entering Manage Content)
  useEffect(() => {
    if (!navigationRestored) {
      const contentNavigation = restoreTabNavigation('content');
      if (
        contentNavigation &&
        navigationState.tabPaths.content.subtab === 'manage'
      ) {
        setActiveTab(contentNavigation.manageSubtab);
      }
      setNavigationRestored(true);
    }
  }, [navigationRestored, navigationState.tabPaths.content.subtab]);

  // Enhanced manage tab change with navigation tracking
  const handleManageTabChange = (tabId: string) => {
    handleManageSubtabChange(tabId as any, setActiveTab);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return <ContentSummary fullContentMap={fullContentMap} />;
      case 'storyfragments':
        return (
          <StoryFragmentTable
            fullContentMap={fullContentMap}
            homeSlug={homeSlug}
          />
        );
      case 'panes':
        return (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <div className="text-lg text-gray-600">
              Panes management - Coming soon
            </div>
          </div>
        );
      case 'menus':
        return (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <div className="text-lg text-gray-600">
              Menus management - Coming soon
            </div>
          </div>
        );
      case 'resources':
        return (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <div className="text-lg text-gray-600">
              Resources management - Coming soon
            </div>
          </div>
        );
      case 'beliefs':
        return (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <div className="text-lg text-gray-600">
              Beliefs management - Coming soon
            </div>
          </div>
        );
      case 'epinets':
        return (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <div className="text-lg text-gray-600">
              Epinets management - Coming soon
            </div>
          </div>
        );
      case 'files':
        return (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <div className="text-lg text-gray-600">
              Files management - Coming soon
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Content Management Sub-Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Content management tabs"
          >
            {contentManagementTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleManageTabChange(tab.id)}
                className={classNames(
                  activeTab === tab.id
                    ? 'bg-cyan-100 text-cyan-700 border-cyan-500'
                    : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200',
                  'rounded-xl px-4 py-1.5 text-sm font-medium border-2 transition-colors duration-200'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Management Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default ManageContent;
