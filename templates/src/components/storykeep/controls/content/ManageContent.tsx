import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '../../../../utils/helpers';
import { navigationStore } from '../../../../stores/navigation';
import { brandConfigStore } from '../../../../stores/brand';
import { getBrandConfig } from '../../../../utils/api/brandConfig';
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

  // Menu form state
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editingMenu, setEditingMenu] = useState<MenuNode | null>(null);
  const [isCreatingMenu, setIsCreatingMenu] = useState(false);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Belief form state
  const [showBeliefForm, setShowBeliefForm] = useState(false);
  const [editingBeliefId, setEditingBeliefId] = useState<string | null>(null);
  const [editingBelief, setEditingBelief] = useState<BeliefNode | null>(null);
  const [isCreatingBelief, setIsCreatingBelief] = useState(false);
  const [isLoadingBelief, setIsLoadingBelief] = useState(false);

  // Known Resource form state
  const [showKnownResourceForm, setShowKnownResourceForm] = useState(false);
  const [editingCategorySlug, setEditingCategorySlug] = useState<string | null>(
    null
  );

  // Resource form state
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(
    null
  );
  const [editingResource, setEditingResource] = useState<ResourceConfig | null>(
    null
  );
  const [isCreatingResource, setIsCreatingResource] = useState(false);
  const [isLoadingResource, setIsLoadingResource] = useState(false);

  // Resource management state
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<
    string | null
  >(null);

  // Subscribe to navigation store and brand config
  const navigationState = useStore(navigationStore);
  const brandConfig = useStore(brandConfigStore);

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

    // Close menu form when switching tabs
    if (showMenuForm) {
      setShowMenuForm(false);
      setEditingMenuId(null);
      setEditingMenu(null);
      setIsCreatingMenu(false);
    }

    // Close belief form when switching tabs
    if (showBeliefForm) {
      setShowBeliefForm(false);
      setEditingBeliefId(null);
      setEditingBelief(null);
      setIsCreatingBelief(false);
    }

    // Close known resource form when switching tabs
    if (showKnownResourceForm) {
      setShowKnownResourceForm(false);
      setEditingCategorySlug(null);
    }

    // Close resource form when switching tabs
    if (showResourceForm) {
      setShowResourceForm(false);
      setEditingResourceId(null);
      setEditingResource(null);
      setIsCreatingResource(false);
    }

    // Reset resource category selection when switching tabs
    if (selectedResourceCategory) {
      setSelectedResourceCategory(null);
    }
  };

  // Menu handlers
  const handleCreateMenu = () => {
    setIsCreatingMenu(true);
    setEditingMenuId(null);
    setEditingMenu(null);
    setShowMenuForm(true);
  };

  const handleEditMenu = async (menuId: string) => {
    setIsLoadingMenu(true);
    try {
      const menu = await getMenuById(menuId);
      setEditingMenuId(menuId);
      setEditingMenu(menu);
      setIsCreatingMenu(false);
      setShowMenuForm(true);
    } catch (error) {
      console.error('Failed to load menu for editing:', error);
      alert('Failed to load menu. Please try again.');
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const handleMenuFormSuccess = () => {
    setShowMenuForm(false);
    setEditingMenuId(null);
    setEditingMenu(null);
    setIsCreatingMenu(false);
    window.location.reload();
  };

  const handleMenuFormCancel = () => {
    setShowMenuForm(false);
    setEditingMenuId(null);
    setEditingMenu(null);
    setIsCreatingMenu(false);
  };

  // Belief handlers
  const handleCreateBelief = () => {
    setIsCreatingBelief(true);
    setEditingBeliefId(null);
    setEditingBelief(null);
    setShowBeliefForm(true);
  };

  const handleEditBelief = async (beliefId: string) => {
    if (!beliefId) {
      handleCreateBelief();
      return;
    }

    setIsLoadingBelief(true);
    try {
      const belief = await getBeliefById(beliefId);
      setEditingBeliefId(beliefId);
      setEditingBelief(belief);
      setIsCreatingBelief(false);
      setShowBeliefForm(true);
    } catch (error) {
      console.error('Failed to load belief for editing:', error);
      alert('Failed to load belief. Please try again.');
    } finally {
      setIsLoadingBelief(false);
    }
  };

  const handleBeliefFormSuccess = () => {
    setShowBeliefForm(false);
    setEditingBeliefId(null);
    setEditingBelief(null);
    setIsCreatingBelief(false);
    window.location.reload();
  };

  const handleBeliefFormCancel = () => {
    setShowBeliefForm(false);
    setEditingBeliefId(null);
    setEditingBelief(null);
    setIsCreatingBelief(false);
  };

  // Known resource handlers
  const handleEditKnownResource = (categorySlug: string) => {
    setEditingCategorySlug(categorySlug);
    setShowKnownResourceForm(true);
  };

  const handleKnownResourceFormBack = () => {
    setShowKnownResourceForm(false);
    setEditingCategorySlug(null);
  };

  const handleKnownResourceSaved = () => {
    setShowKnownResourceForm(false);
    setEditingCategorySlug(null);
    window.location.reload();
  };

  // Resource handlers
  const handleCreateResource = () => {
    setIsCreatingResource(true);
    setEditingResourceId(null);
    setEditingResource(null);
    setShowResourceForm(true);
  };

  const handleEditResource = async (resourceId: string) => {
    setIsLoadingResource(true);
    try {
      const resource = await getResource(resourceId);
      setEditingResourceId(resourceId);
      setEditingResource(resource);
      setIsCreatingResource(false);
      setShowResourceForm(true);
    } catch (error) {
      console.error('Failed to load resource for editing:', error);
      alert('Failed to load resource. Please try again.');
    } finally {
      setIsLoadingResource(false);
    }
  };

  const handleResourceFormSuccess = () => {
    setShowResourceForm(false);
    setEditingResourceId(null);
    setEditingResource(null);
    setIsCreatingResource(false);
    window.location.reload();
  };

  const handleResourceFormCancel = () => {
    setShowResourceForm(false);
    setEditingResourceId(null);
    setEditingResource(null);
    setIsCreatingResource(false);
  };

  // Resource category handlers
  const handleResourceCategorySelect = (categorySlug: string) => {
    setSelectedResourceCategory(categorySlug);
  };

  // Refresh handler
  const handleRefresh = () => {
    window.location.reload();
  };

  const renderTabContent = () => {
    // Show menu form if active
    if (showMenuForm && activeTab === 'menus') {
      return (
        <MenuForm
          menu={editingMenu || undefined}
          isCreate={isCreatingMenu}
          contentMap={fullContentMap}
          onSuccess={handleMenuFormSuccess}
          onCancel={handleMenuFormCancel}
        />
      );
    }

    // Show belief form if active
    if (showBeliefForm && activeTab === 'beliefs') {
      return (
        <BeliefForm
          belief={editingBelief || undefined}
          isCreate={isCreatingBelief}
          onSuccess={handleBeliefFormSuccess}
          onCancel={handleBeliefFormCancel}
        />
      );
    }

    // Show known resource form if active
    if (showKnownResourceForm && activeTab === 'resources') {
      return (
        <KnownResourceForm
          categorySlug={editingCategorySlug || 'new'}
          contentMap={fullContentMap}
          onBack={handleKnownResourceFormBack}
          onSaved={handleKnownResourceSaved}
        />
      );
    }

    // Show resource form if active for dynamic resource category tabs
    if (showResourceForm && resourceCategories.includes(activeTab)) {
      return (
        <ResourceForm
          resourceData={editingResource || undefined}
          categorySlug={activeTab}
          categorySchema={knownResources[activeTab] || {}}
          isCreate={isCreatingResource}
          onSuccess={handleResourceFormSuccess}
          onCancel={handleResourceFormCancel}
        />
      );
    }

    // Handle dynamic resource category tabs
    if (resourceCategories.includes(activeTab)) {
      return (
        <ResourceTable
          categorySlug={activeTab}
          fullContentMap={fullContentMap}
          onEdit={handleEditResource}
          onCreate={handleCreateResource}
          onRefresh={handleRefresh}
          isLoading={isLoadingResource}
        />
      );
    }

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
          <MenuTable
            fullContentMap={fullContentMap}
            onEdit={handleEditMenu}
            onCreate={handleCreateMenu}
            onRefresh={handleRefresh}
            isLoading={isLoadingMenu}
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
                contentMap={fullContentMap}
                onEdit={handleEditKnownResource}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
        );

      case 'beliefs':
        const beliefs = fullContentMap
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
            onRefresh={handleRefresh}
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
                      ? 'text-mydarkgrey border-orange-500 bg-orange-100'
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
                      fullContentMap.filter(
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
