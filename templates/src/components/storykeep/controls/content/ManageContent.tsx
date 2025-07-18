import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '../../../../utils/helpers';
import { navigationStore } from '../../../../stores/navigation';
import { brandConfigStore } from '../../../../stores/brand';
import { getBrandConfig } from '../../../../utils/api/brandConfig';
import { getFullContentMap } from '../../../../stores/analytics';
import {
  handleManageSubtabChange,
  restoreTabNavigation,
} from '../../../../utils/navigationHelpers';
import { getMenuById } from '../../../../utils/api/menuConfig';
import { getBeliefById } from '../../../../utils/api/beliefConfig';
import { getResource } from '../../../../utils/api/resourceConfig';
import ContentSummary from './ContentSummary';
import StoryFragmentTable from './StoryFragmentTable';
import MenuTable from './MenuTable';
import MenuForm from './MenuForm';
import BeliefTable from './BeliefTable';
import BeliefForm from './BeliefForm';
import KnownResourceTable from './KnownResourceTable';
import KnownResourceForm from './KnownResourceForm';
import ResourceTable from './ResourceTable';
import ResourceForm from './ResourceForm';
import type {
  FullContentMapItem,
  MenuNode,
  BeliefNode,
  ResourceConfig,
} from '../../../../types/tractstack';

interface ManageContentProps {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
}

interface ContentManagementTab {
  id: string;
  name: string;
  isResourceCategory?: boolean;
}

const staticContentManagementTabs: ContentManagementTab[] = [
  { id: 'summary', name: 'Summary' },
  { id: 'storyfragments', name: 'Story Fragments' },
  { id: 'menus', name: 'Menus' },
  { id: 'resources', name: 'Resources' },
  { id: 'beliefs', name: 'Beliefs' },
  //{ id: 'panes', name: 'Panes' },
  //{ id: 'epinets', name: 'Epinets' },
  //{ id: 'files', name: 'Files' },
];

const ManageContent = ({
  fullContentMap: initialContentMap,
  homeSlug,
}: ManageContentProps) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [navigationRestored, setNavigationRestored] = useState(false);
  const [currentContentMap, setCurrentContentMap] =
    useState<FullContentMapItem[]>(initialContentMap);

  const [activeMenuForm, setActiveMenuForm] = useState<
    MenuNode | 'create' | null
  >(null);
  const [activeBeliefForm, setActiveBeliefForm] = useState<
    BeliefNode | 'create' | null
  >(null);
  const [activeKnownResourceForm, setActiveKnownResourceForm] = useState<
    string | null
  >(null);
  const [activeResourceForm, setActiveResourceForm] = useState<{
    resource: ResourceConfig | null;
    category: string;
  } | null>(null);

  // Subscribe to navigation store and brand config
  const navigationState = useStore(navigationStore);
  const brandConfig = useStore(brandConfigStore);

  // Data refresh function - uses EXISTING API functions
  const refreshData = async () => {
    try {
      // Use existing getFullContentMap function from analytics store
      const newContentMap = await getFullContentMap();
      setCurrentContentMap(newContentMap);

      // Use existing getBrandConfig function
      const newBrandConfig = await getBrandConfig();
      brandConfigStore.set(newBrandConfig);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  // Load brandConfig if not already loaded
  useEffect(() => {
    if (!brandConfig) {
      getBrandConfig()
        .then((config) => {
          brandConfigStore.set(config);
        })
        .catch((error) => {
          console.error('Failed to load brand config:', error);
        });
    }
  }, [brandConfig]);

  // Update content map when prop changes
  useEffect(() => {
    setCurrentContentMap(initialContentMap);
  }, [initialContentMap]);

  // Generate dynamic tabs including resource categories
  const knownResources = brandConfig?.KNOWN_RESOURCES || {};
  const resourceCategories = Object.keys(knownResources);

  const contentManagementTabs: ContentManagementTab[] = [
    ...staticContentManagementTabs.filter((tab) => tab.id !== 'resources'),
    { id: 'resources', name: 'Resources' },
    ...resourceCategories.map((category) => ({
      id: category,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      isResourceCategory: true,
    })),
  ];

  // Restore navigation state when component mounts
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

    // Close all forms when switching tabs
    setActiveMenuForm(null);
    setActiveBeliefForm(null);
    setActiveKnownResourceForm(null);
    setActiveResourceForm(null);
  };

  // Menu handlers - simplified
  const handleCreateMenu = () => {
    setActiveMenuForm('create');
  };

  const handleEditMenu = async (menuId: string) => {
    try {
      const menu = await getMenuById(menuId);
      setActiveMenuForm(menu);
    } catch (error) {
      console.error('Failed to load menu for editing:', error);
      alert('Failed to load menu. Please try again.');
    } finally {
    }
  };

  // Belief handlers - simplified
  const handleCreateBelief = () => {
    setActiveBeliefForm('create');
  };

  const handleEditBelief = async (beliefId: string) => {
    if (!beliefId) {
      handleCreateBelief();
      return;
    }

    try {
      const belief = await getBeliefById(beliefId);
      setActiveBeliefForm(belief);
    } catch (error) {
      console.error('Failed to load belief for editing:', error);
      alert('Failed to load belief. Please try again.');
    } finally {
    }
  };

  // Known resource handlers - simplified
  const handleEditKnownResource = (categorySlug: string) => {
    setActiveKnownResourceForm(categorySlug);
  };

  // Resource handlers - simplified
  const handleCreateResource = () => {
    setActiveResourceForm({
      resource: null,
      category: activeTab,
    });
  };

  const handleEditResource = async (resourceId: string) => {
    try {
      const resource = await getResource(resourceId);
      setActiveResourceForm({
        resource,
        category: activeTab,
      });
    } catch (error) {
      console.error('Failed to load resource for editing:', error);
      alert('Failed to load resource. Please try again.');
    } finally {
    }
  };

  const renderTabContent = () => {
    // Forms take precedence - simplified logic
    if (activeTab === 'menus' && activeMenuForm) {
      return (
        <MenuForm
          menu={activeMenuForm === 'create' ? undefined : activeMenuForm}
          isCreate={activeMenuForm === 'create'}
          contentMap={currentContentMap}
          onClose={async (saved: boolean) => {
            setActiveMenuForm(null);
            if (saved) await refreshData();
          }}
        />
      );
    }

    if (activeTab === 'beliefs' && activeBeliefForm) {
      return (
        <BeliefForm
          belief={activeBeliefForm === 'create' ? undefined : activeBeliefForm}
          isCreate={activeBeliefForm === 'create'}
          onClose={async (saved: boolean) => {
            setActiveBeliefForm(null);
            if (saved) await refreshData();
          }}
        />
      );
    }

    if (activeTab === 'resources' && activeKnownResourceForm) {
      return (
        <KnownResourceForm
          categorySlug={activeKnownResourceForm}
          contentMap={currentContentMap}
          onClose={async (saved: boolean) => {
            setActiveKnownResourceForm(null);
            if (saved) await refreshData();
          }}
        />
      );
    }

    // Resource form for dynamic category tabs
    if (resourceCategories.includes(activeTab) && activeResourceForm) {
      return (
        <ResourceForm
          resourceData={activeResourceForm.resource || undefined}
          categorySlug={activeResourceForm.category}
          categorySchema={knownResources[activeResourceForm.category] || {}}
          isCreate={!activeResourceForm.resource}
          onClose={async (saved: boolean) => {
            setActiveResourceForm(null);
            if (saved) await refreshData();
          }}
        />
      );
    }

    // Handle dynamic resource category tabs - show table
    if (resourceCategories.includes(activeTab)) {
      return (
        <ResourceTable
          categorySlug={activeTab}
          fullContentMap={currentContentMap}
          onEdit={handleEditResource}
          onCreate={handleCreateResource}
          onRefresh={refreshData}
        />
      );
    }

    // Static tab content
    switch (activeTab) {
      case 'summary':
        return <ContentSummary fullContentMap={currentContentMap} />;

      case 'storyfragments':
        return (
          <StoryFragmentTable
            fullContentMap={currentContentMap}
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
          <MenuTable
            fullContentMap={currentContentMap}
            onEdit={handleEditMenu}
            onCreate={handleCreateMenu}
            onRefresh={refreshData}
          />
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Resource Categories
              </h3>
              <KnownResourceTable
                contentMap={currentContentMap}
                onEdit={handleEditKnownResource}
                onRefresh={refreshData}
              />
            </div>
          </div>
        );

      case 'beliefs':
        const beliefs = currentContentMap
          .filter((item) => item.type === 'Belief')
          .map((item) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            scale: item.scale || '',
            customValues: [], // Will be loaded when editing
          })) as BeliefNode[];

        return (
          <BeliefTable
            beliefs={beliefs}
            onEdit={handleEditBelief}
            onRefresh={refreshData}
          />
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
        <div className="border-b border-gray-200 pb-2.5">
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
                    ? tab.isResourceCategory
                      ? 'border-dashed text-mydarkgrey border-gray-500 bg-white'
                      : 'border-cyan-500 bg-cyan-100 text-cyan-700'
                    : tab.isResourceCategory
                      ? 'text-mydarkgrey border-transparent bg-orange-50 hover:bg-orange-100'
                      : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200',
                  'rounded-xl border-2 px-4 py-1.5 text-sm font-bold transition-colors duration-200'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.name}
                {tab.isResourceCategory && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {
                      currentContentMap.filter(
                        (item) =>
                          item.type === 'Resource' &&
                          item.categorySlug === tab.id
                      ).length
                    }
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  );
};

export default ManageContent;
