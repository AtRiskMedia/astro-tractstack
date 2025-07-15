import { useState } from 'react';
import { classNames } from '../../../../utils/helpers';
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
            className="-mb-px flex flex-wrap gap-x-6"
            aria-label="Content management tabs"
          >
            {contentManagementTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium'
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
