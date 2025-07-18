import { useState } from 'react';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import { deleteResource } from '../../../../utils/api/resourceConfig';
import type { FullContentMapItem } from '../../../../types/tractstack';

interface ResourceTableProps {
  categorySlug: string;
  fullContentMap: FullContentMapItem[];
  onEdit: (resourceId: string) => void;
  onCreate: () => void;
  onRefresh: () => void;
}

export default function ResourceTable({
  categorySlug,
  fullContentMap,
  onEdit,
  onCreate,
  onRefresh,
}: ResourceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter resources for this category
  const categoryResources = fullContentMap.filter(
    (item) => item.type === 'Resource' && item.categorySlug === categorySlug
  );

  const filteredResources = categoryResources.filter(
    (resource) =>
      resource.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle delete resource
  const handleDelete = async (
    resourceId: string,
    title: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(resourceId);
    try {
      await deleteResource(resourceId);
      onRefresh(); // Refresh the table data
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete resource. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle edit resource
  const handleEdit = (resourceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onEdit(resourceId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}{' '}
            Resources
          </h3>
          <p className="text-sm text-gray-600">
            Manage {categorySlug} resources
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
          Create {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}
        </button>
      </div>

      {/* Search and refresh */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={`Search ${categorySlug} resources...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                One-liner
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredResources.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    {categoryResources.length === 0
                      ? `No ${categorySlug} resources created yet`
                      : 'No resources match your search'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredResources.map((resource) => (
                <tr
                  key={resource.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onEdit(resource.id)}
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {resource.title}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {resource.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {(resource as any).oneliner || '-'}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Edit button */}
                      <button
                        onClick={(e) => handleEdit(resource.id, e)}
                        className="text-cyan-600 hover:text-cyan-900"
                        title="Edit resource"
                        disabled={isDeleting === resource.id}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={(e) =>
                          handleDelete(
                            resource.id,
                            resource.title || 'Untitled',
                            e
                          )
                        }
                        disabled={isDeleting === resource.id}
                        title="Delete resource"
                        className={`transition-colors ${
                          isDeleting !== resource.id
                            ? 'text-red-600 hover:text-red-900'
                            : 'cursor-not-allowed text-gray-300'
                        }`}
                      >
                        {isDeleting === resource.id ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                        ) : (
                          <TrashIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
