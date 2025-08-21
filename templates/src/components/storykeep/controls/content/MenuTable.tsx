import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import { deleteMenu } from '@/utils/api/menuConfig';
import {
  orphanAnalysisStore,
  loadOrphanAnalysis,
} from '@/stores/orphanAnalysis';
import type { FullContentMapItem } from '@/types/tractstack';

interface MenuTableProps {
  fullContentMap: FullContentMapItem[];
  onEdit: (menuId: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
}

export default function MenuTable({
  fullContentMap,
  onEdit,
  onCreate,
  onRefresh,
}: MenuTableProps) {
  const [query, setQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Subscribe to orphan analysis store
  const orphanState = useStore(orphanAnalysisStore);

  // Load orphan analysis on component mount
  useEffect(() => {
    loadOrphanAnalysis();
  }, []);

  // Filter menus from fullContentMap
  const menuItems = useMemo(() => {
    return fullContentMap.filter((item) => item.type === 'Menu');
  }, [fullContentMap]);

  // Filter menus based on search query
  const filteredMenus = useMemo(() => {
    if (!query.trim()) return menuItems;

    const searchTerm = query.toLowerCase();
    return menuItems.filter(
      (menu) =>
        menu.title.toLowerCase().includes(searchTerm) ||
        (menu.theme && menu.theme.toLowerCase().includes(searchTerm))
    );
  }, [menuItems, query]);

  // Get usage information for each menu using orphan analysis
  const getMenuUsage = (menuId: string): string[] => {
    if (!orphanState.data || !orphanState.data.menus) {
      return [];
    }
    return orphanState.data.menus[menuId] || [];
  };

  // Get story fragment titles for usage display
  const getUsageDetails = (menuId: string) => {
    const usageIds = getMenuUsage(menuId);
    return usageIds.map((sfId) => {
      const sf = fullContentMap.find(
        (item) => item.id === sfId && item.type === 'StoryFragment'
      );
      return sf ? sf.title : `Unknown (${sfId})`;
    });
  };

  // Check if delete should be disabled
  const shouldDisableDelete = (menu: FullContentMapItem): boolean => {
    // ALWAYS disable if orphan analysis is not complete
    if (
      !orphanState ||
      !orphanState.data ||
      !orphanState.data.menus ||
      orphanState.isLoading ||
      orphanState.data.status !== 'complete'
    ) {
      return true;
    }

    const usage = getMenuUsage(menu.id);
    return usage.length > 0;
  };

  // Helper function to get delete tooltip
  const getDeleteTooltip = (menu: FullContentMapItem): string => {
    if (
      !orphanState ||
      !orphanState.data ||
      !orphanState.data.menus ||
      orphanState.isLoading ||
      orphanState.data.status !== 'complete'
    ) {
      return 'Loading usage analysis...';
    }

    const usage = getMenuUsage(menu.id);
    if (usage.length > 0) {
      return `Cannot delete: menu is used by ${usage.length} story fragment(s)`;
    }

    return 'Delete menu';
  };

  const handleDelete = async (menu: FullContentMapItem) => {
    const usage = getMenuUsage(menu.id);

    if (usage.length > 0) {
      const usageDetails = getUsageDetails(menu.id);
      alert(
        `Cannot delete menu "${menu.title}": it is currently used by ${usage.length} story fragment(s):\n\n${usageDetails.join('\n')}`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete the menu "${menu.title}"?`)) {
      return;
    }

    try {
      setIsDeleting(menu.id);
      await deleteMenu(
        window.TRACTSTACK_CONFIG?.tenantId || 'default',
        menu.id
      );

      // Reload orphan analysis after successful deletion
      await loadOrphanAnalysis();
      onRefresh();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete menu. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Menus</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage navigation menus for your site
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center rounded-md border border-transparent bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Menu
        </button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Search menus..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
        />
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        {filteredMenus.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-bold text-gray-900">
              {query ? 'No matching menus found' : 'No menus'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {query
                ? 'Try adjusting your search terms.'
                : 'Get started by creating your first menu.'}
            </p>
            {!query && (
              <button
                onClick={onCreate}
                className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700"
              >
                Create Menu
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 md:px-6">
                    Title
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 md:table-cell md:px-6">
                    Theme
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 xl:table-cell xl:px-6">
                    Usage
                  </th>
                  <th className="px-3 py-3 text-right md:px-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredMenus.map((menu) => {
                  const usage = getMenuUsage(menu.id);
                  const usageDetails = getUsageDetails(menu.id);
                  const isInUse = usage.length > 0;
                  const canDelete = !shouldDisableDelete(menu);
                  const deleteTooltip = getDeleteTooltip(menu);

                  return (
                    <tr key={menu.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 md:px-6">
                        <div className="flex flex-col">
                          <div className="text-sm font-bold text-gray-900">
                            {menu.title}
                          </div>
                          <div className="text-sm text-gray-500 md:hidden">
                            {menu.theme || 'No theme'}
                          </div>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 md:table-cell md:px-6">
                        {menu.theme || 'No theme'}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-4 text-sm xl:table-cell xl:px-6">
                        {!orphanState.data ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 animate-pulse rounded-full bg-gray-400"
                              style={{
                                animationDuration: window.matchMedia(
                                  '(prefers-reduced-motion: reduce)'
                                ).matches
                                  ? '2s'
                                  : '1s',
                              }}
                            />
                          </div>
                        ) : isInUse ? (
                          <div className="group relative">
                            <span className="inline-flex cursor-help items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                              {usage.length} usage
                              {usage.length !== 1 ? 's' : ''}
                            </span>
                            {/* Tooltip */}
                            <div className="invisible absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg group-hover:visible">
                              Used by: {usageDetails.slice(0, 3).join(', ')}
                              {usageDetails.length > 3 &&
                                ` +${usageDetails.length - 3} more`}
                              <div className="absolute left-1/2 top-full -translate-x-1/2 transform border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-800">
                            Unused
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold md:px-6">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onEdit(menu.id)}
                            className="text-cyan-600 hover:text-cyan-900 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Edit menu"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => canDelete && handleDelete(menu)}
                            disabled={!canDelete || isDeleting === menu.id}
                            title={deleteTooltip}
                            className={`transition-colors ${
                              canDelete && isDeleting !== menu.id
                                ? 'text-red-600 hover:text-red-900'
                                : 'cursor-not-allowed text-gray-300'
                            }`}
                          >
                            {isDeleting === menu.id ? (
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                            ) : (
                              <TrashIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
