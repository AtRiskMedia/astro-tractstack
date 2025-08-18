import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import { classNames } from '@/utils/helpers';
import {
  orphanAnalysisStore,
  loadOrphanAnalysis,
} from '@/stores/orphanAnalysis';
import UsageCell from '../UsageCell';
import type { FullContentMapItem } from '@/types/tractstack';

interface StoryFragmentTableProps {
  fullContentMap: FullContentMapItem[];
  homeSlug: string;
}

const StoryFragmentTable = ({
  fullContentMap,
  homeSlug,
}: StoryFragmentTableProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const itemsPerPage = 20;

  // Helper function to get status display
  const getStatus = (item: FullContentMapItem): string => {
    if (item.slug === homeSlug) return 'Home';
    return 'Published'; // Assuming all fragments are published for now
  };

  // Subscribe to orphan analysis store
  const orphanState = useStore(orphanAnalysisStore);

  // Load orphan analysis on component mount
  useEffect(() => {
    loadOrphanAnalysis();
  }, []);

  // Filter story fragments from fullContentMap
  const storyFragments = useMemo(() => {
    return fullContentMap.filter((item) => item.type === 'StoryFragment');
  }, [fullContentMap]);

  // Apply search filter
  const filteredFragments = useMemo(() => {
    if (!searchTerm.trim()) return storyFragments;

    const search = searchTerm.toLowerCase();
    return storyFragments.filter(
      (item) =>
        item.title.toLowerCase().includes(search) ||
        item.slug.toLowerCase().includes(search)
    );
  }, [storyFragments, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredFragments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFragments = filteredFragments.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Helper function to get usage information
  const getUsageInfo = (storyFragmentId: string): string[] => {
    if (!orphanState?.data || !orphanState.data.storyFragments) {
      return [];
    }
    return orphanState.data.storyFragments[storyFragmentId] || [];
  };

  // Helper function to check if delete should be disabled
  const shouldDisableDelete = (item: FullContentMapItem): boolean => {
    // Always disable if orphan data hasn't loaded yet OR storyFragments data isn't available
    if (!orphanState.data || !orphanState.data.storyFragments) {
      return true;
    }

    // Disable if item is home page
    if (item.slug === homeSlug) {
      return true;
    }

    // Disable if item has usage dependencies
    const usage = getUsageInfo(item.id);
    return usage.length > 0;
  };

  // Helper function to get delete tooltip
  const getDeleteTooltip = (item: FullContentMapItem): string => {
    if (!orphanState.data || !orphanState.data.storyFragments) {
      return 'Loading usage analysis...';
    }

    if (item.slug === homeSlug) {
      return 'Cannot delete the home page';
    }

    const usage = getUsageInfo(item.id);
    if (usage.length > 0) {
      return `Cannot delete: story fragment has ${usage.length} dependent(s)`;
    }

    return 'Delete story fragment';
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle delete story fragment
  const handleDelete = async (id: string, title: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/storyfragments/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete story fragment');
      }

      // Reload the page to refresh the data
      window.location.reload();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete story fragment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Story Fragments</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage pages and content on your site
          </p>
        </div>
        <a
          href="/create/edit"
          className="flex items-center rounded-md border border-transparent bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
          Create Story Fragment
        </a>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Search story fragments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-700 focus:ring-cyan-700"
        />
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        {filteredFragments.length === 0 ? (
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
              {searchTerm
                ? 'No matching story fragments found'
                : 'No story fragments'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? 'Try adjusting your search terms.'
                : 'Get started by creating your first story fragment.'}
            </p>
            {!searchTerm && (
              <>
                <p className="mt-2 text-sm text-gray-500">
                  Story fragments are the pages and content sections of your
                  site.
                </p>
                <a
                  href="/create/edit"
                  className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700"
                >
                  Create Story Fragment
                </a>
              </>
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
                    Slug
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 md:table-cell md:px-6">
                    Status
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
                {paginatedFragments.map((item) => {
                  const canDelete = !shouldDisableDelete(item);
                  const deleteTooltip = getDeleteTooltip(item);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 md:px-6">
                        <div className="flex flex-col">
                          <div className="text-sm font-bold text-gray-900">
                            {item.title}
                          </div>
                          <div className="text-sm text-gray-500 md:hidden">
                            /{item.slug}
                          </div>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 md:table-cell md:px-6">
                        /{item.slug}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-4 text-sm md:table-cell md:px-6">
                        <span
                          className={classNames(
                            'inline-flex rounded-full px-2 text-xs font-bold leading-5',
                            item.slug === homeSlug
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          )}
                        >
                          {getStatus(item)}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 xl:table-cell xl:px-6">
                        <UsageCell
                          itemId={item.id}
                          fullContentMap={fullContentMap}
                          usageType="storyFragments"
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold md:px-6">
                        <div className="flex items-center justify-end space-x-2">
                          <a
                            href={`/${item.slug}`}
                            className="text-gray-600 hover:text-gray-900"
                            title="View story fragment"
                          >
                            View
                          </a>
                          <a
                            href={`/${item.slug}/edit`}
                            className="text-cyan-600 hover:text-cyan-900"
                            title="Edit story fragment"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </a>
                          <button
                            onClick={() =>
                              canDelete && handleDelete(item.id, item.title)
                            }
                            disabled={!canDelete}
                            title={deleteTooltip}
                            className={classNames(
                              canDelete
                                ? 'text-red-600 hover:text-red-900'
                                : 'cursor-not-allowed text-gray-300',
                              'transition-colors'
                            )}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 bg-white px-4 py-3 md:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-1 justify-between md:hidden">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={classNames(
                        'relative inline-flex items-center rounded-md px-4 py-2 text-sm font-bold',
                        currentPage === 1
                          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={classNames(
                        'relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-bold',
                        currentPage === totalPages
                          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden md:flex md:flex-1 md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-bold">{startIndex + 1}</span> to{' '}
                        <span className="font-bold">
                          {Math.min(
                            startIndex + itemsPerPage,
                            filteredFragments.length
                          )}
                        </span>{' '}
                        of{' '}
                        <span className="font-bold">
                          {filteredFragments.length}
                        </span>{' '}
                        results
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={classNames(
                            'relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0',
                            currentPage === 1
                              ? 'cursor-not-allowed'
                              : 'hover:bg-gray-50'
                          )}
                        >
                          <span className="sr-only">Previous</span>
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>

                        {/* Page numbers */}
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={classNames(
                              'relative inline-flex items-center px-4 py-2 text-sm font-bold focus:outline-offset-0',
                              page === currentPage
                                ? 'z-10 bg-cyan-600 text-white focus:ring-2 focus:ring-cyan-500'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                            )}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={classNames(
                            'relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0',
                            currentPage === totalPages
                              ? 'cursor-not-allowed'
                              : 'hover:bg-gray-50'
                          )}
                        >
                          <span className="sr-only">Next</span>
                          <svg
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <div className="text-lg text-gray-600">Processing...</div>
        </div>
      )}
    </div>
  );
};

export default StoryFragmentTable;
