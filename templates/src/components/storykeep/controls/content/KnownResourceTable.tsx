import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import { brandConfigStore } from '../../../../stores/brand';
import { getBrandConfig } from '../../../../utils/api/brandConfig';
import type { FullContentMapItem } from '../../../../types/tractstack';

interface KnownResourceTableProps {
  contentMap: FullContentMapItem[];
  onEdit: (categorySlug: string) => void;
}

const KnownResourceTable = ({
  contentMap,
  onEdit,
}: KnownResourceTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
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
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-x-2 rounded-md bg-cyan-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
        >
          <PlusIcon className="-ml-0.5 h-5 w-5" />
          New Category
        </button>
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
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Resource Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Field Count
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
                      ? 'No resource categories defined yet'
                      : 'No categories match your search'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCategories.map((categorySlug) => {
                const resourceCount = getResourceCount(categorySlug);
                const fieldCount = Object.keys(
                  knownResources[categorySlug] || {}
                ).length;

                return (
                  <tr
                    key={categorySlug}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => onEdit(categorySlug)}
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {categorySlug}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {resourceCount}{' '}
                      {resourceCount === 1 ? 'resource' : 'resources'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(categorySlug);
                        }}
                        className="text-cyan-600 hover:text-cyan-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                        <span className="sr-only">Edit {categorySlug}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KnownResourceTable;
