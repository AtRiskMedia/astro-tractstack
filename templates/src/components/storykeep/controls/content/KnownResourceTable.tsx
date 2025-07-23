import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import { brandConfigStore } from '@/stores/brand';
import {
  getBrandConfig,
  saveBrandConfigWithStateUpdate,
} from '@/utils/api/brandConfig';
import { convertToLocalState } from '@/utils/api/brandHelpers';
import ResourceBulkIngest from './ResourceBulkIngest';
import type { FullContentMapItem } from '@/types/tractstack';
import type { MouseEvent } from 'react';

interface KnownResourceTableProps {
  contentMap: FullContentMapItem[];
  onEdit: (categorySlug: string) => void;
  onRefresh?: () => void;
}

const KnownResourceTable = ({
  contentMap,
  onEdit,
  onRefresh,
}: KnownResourceTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showBulkIngest, setShowBulkIngest] = useState(false);
  const brandConfig = useStore(brandConfigStore);

  // Load brandConfig if not already loaded
  useEffect(() => {
    if (!brandConfig) {
      getBrandConfig(window.TRACTSTACK_CONFIG?.tenantId || 'default')
        .then((config) => {
          brandConfigStore.set(
            window.TRACTSTACK_CONFIG?.tenantId || 'default',
            config
          );
        })
        .catch((error) => {
          console.error('Failed to load brand config:', error);
        });
    }
  }, [brandConfig]);

  const knownResources = brandConfig?.KNOWN_RESOURCES || {};

  const getResourceCount = (categorySlug: string): number => {
    return contentMap.filter((item) => item.categorySlug === categorySlug)
      .length;
  };

  const filteredCategories = Object.keys(knownResources).filter((category) =>
    category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateNew = () => {
    onEdit('new');
  };

  const handleDelete = async (categorySlug: string, event: MouseEvent) => {
    event.stopPropagation();

    const resourceCount = getResourceCount(categorySlug);

    if (resourceCount > 0) {
      alert(
        `Cannot delete category "${categorySlug}": it has ${resourceCount} resource(s). Delete all resources in this category first.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the resource category "${categorySlug}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(categorySlug);
    try {
      if (!brandConfig) throw new Error('Brand config not loaded');

      const brandState = convertToLocalState(brandConfig);
      const updatedKnownResources = { ...brandState.knownResources };
      delete updatedKnownResources[categorySlug];

      const updatedBrandState = {
        ...brandState,
        knownResources: updatedKnownResources,
      };

      await saveBrandConfigWithStateUpdate(
        window.TRACTSTACK_CONFIG?.tenantId || 'default',
        updatedBrandState,
        brandState
      );

      // Refresh the data
      onRefresh?.();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete resource category. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Resource Categories
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage resource category schemas and field definitions
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkIngest(true)}
            className="inline-flex items-center rounded-md bg-orange-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-500"
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Bulk Import
          </button>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-x-2 rounded-md bg-cyan-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
          >
            <PlusIcon className="-ml-0.5 h-5 w-5" />
            New Category
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
          />
        </div>
      </div>

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Resources
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                Fields
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    {Object.keys(knownResources).length === 0
                      ? 'No resource categories created yet'
                      : 'No categories match your search'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCategories.map((categorySlug) => {
                const resourceCount = getResourceCount(categorySlug);
                const fieldCount = Object.keys(
                  knownResources[categorySlug]
                ).length;
                const canDelete = resourceCount === 0;

                return (
                  <tr
                    key={categorySlug}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => onEdit(categorySlug)}
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900">
                      {categorySlug}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {resourceCount}{' '}
                      {resourceCount === 1 ? 'resource' : 'resources'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-bold sm:pr-6">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Edit button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(categorySlug);
                          }}
                          className="text-cyan-600 hover:text-cyan-900"
                          title="Edit category"
                          disabled={isDeleting === categorySlug}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDelete(categorySlug, e)}
                          disabled={!canDelete || isDeleting === categorySlug}
                          title={
                            canDelete
                              ? 'Delete category'
                              : `Cannot delete: category has ${resourceCount} resource(s)`
                          }
                          className={`transition-colors ${
                            canDelete && isDeleting !== categorySlug
                              ? 'text-red-600 hover:text-red-900'
                              : 'cursor-not-allowed text-gray-300'
                          }`}
                        >
                          {isDeleting === categorySlug ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                          ) : (
                            <TrashIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showBulkIngest && (
        <ResourceBulkIngest
          fullContentMap={contentMap}
          onClose={(saved: boolean) => {
            setShowBulkIngest(false);
            if (saved) {
              onRefresh?.();
            }
          }}
          onRefresh={onRefresh || (() => {})}
        />
      )}
    </div>
  );
};

export default KnownResourceTable;
