import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '../../../../utils/helpers';
import { navigationStore } from '../../../../stores/navigation';
import {
  handleManageSubtabChange,
  restoreTabNavigation,
} from '../../../../utils/navigationHelpers';
import { getMenuById } from '../../../../utils/api/menuConfig';
import { getBeliefById } from '../../../../utils/api/beliefConfig';
import ContentSummary from './ContentSummary';
import StoryFragmentTable from './StoryFragmentTable';
import MenuTable from './MenuTable';
import MenuForm from './MenuForm';
import BeliefTable from './BeliefTable';
import BeliefForm from './BeliefForm';
import type {
  FullContentMapItem,
  MenuNode,
  BeliefNode,
} from '../../../../types/tractstack';

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

  // Handle refresh after delete
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
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <div className="text-lg text-gray-600">
              Resources management - Coming soon
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
        <div className="border-b border-gray-200 py-12">
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
                    ? 'border-cyan-500 bg-cyan-100 text-cyan-700'
                    : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200',
                  'rounded-xl border-2 px-4 py-1.5 text-sm font-bold transition-colors duration-200'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Loading overlays */}
      {isLoadingMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-600"></div>
              <span className="text-gray-700">Loading menu...</span>
            </div>
          </div>
        </div>
      )}

      {isLoadingBelief && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-cyan-600"></div>
              <span className="text-gray-700">Loading belief...</span>
            </div>
          </div>
        </div>
      )}

      {/* Content Management Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default ManageContent;
