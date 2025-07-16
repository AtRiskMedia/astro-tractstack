import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '../../../../utils/helpers';
import {
  orphanAnalysisStore,
  loadOrphanAnalysis,
} from '../../../../stores/orphanAnalysis';
import type { FullContentMapItem } from '../../../../types/tractstack';

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
  const [hoveredUsage, setHoveredUsage] = useState<string | null>(null);

  const itemsPerPage = 20;

  // Helper function to get title from ID
  const getTitleFromId = (id: string) => {
    const item = fullContentMap.find((content) => content.id === id);
    return item ? `${item.title} (${item.type})` : id; // Fallback to ID if title not found
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

  // Helper function to get usage information for a story fragment
  const getUsageInfo = (storyFragmentId: string) => {
    if (!orphanState.data || !orphanState.data.storyFragments) {
      return { isUsed: false, usedBy: [] };
    }

    const dependencies = orphanState.data.storyFragments[storyFragmentId] || [];
    return {
      isUsed: dependencies.length > 0,
      usedBy: dependencies,
    };
  };

  // Helper function to check if item is home page
  const isHomePage = (slug: string) => {
    return slug === homeSlug;
  };

  // Helper function to determine if delete should be disabled
  const shouldDisableDelete = (item: FullContentMapItem) => {
    if (isHomePage(item.slug)) return true; // Home page can't be deleted

    const usage = getUsageInfo(item.id);
    return usage.isUsed; // In-use items can't be deleted
  };

  // Helper function to get delete button tooltip
  const getDeleteTooltip = (item: FullContentMapItem) => {
    if (isHomePage(item.slug)) {
      return 'Cannot delete the home page';
    }

    const usage = getUsageInfo(item.id);
    if (usage.isUsed) {
      return `Cannot delete - used by: ${usage.usedBy.join(', ')}`;
    }

    return undefined;
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle navigation
  const handleCreate = () => {
    window.location.href = '/create/edit';
  };

  const handleEdit = (slug: string) => {
    window.location.href = `/${slug}/edit`;
  };

  const handleView = (slug: string) => {
    window.location.href = `/${slug}`;
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement delete API call
      console.log('Deleting Story Fragment:', id);
      // await api.delete(`/api/v1/nodes/storyfragments/${id}`);

      // After successful deletion, reload orphan analysis
      // await loadOrphanAnalysis();
    } catch (error) {
      console.error('Error deleting story fragment:', error);
      alert('Failed to delete story fragment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Search and Create */}
      <div className="flex items-center justify-between">
        <div className="max-w-lg flex-1">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search story fragments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-gray-300 py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-cyan-500"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="ml-4 rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
        >
          Create Story Fragment
        </button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {filteredFragments.length === storyFragments.length ? (
          <>Showing {filteredFragments.length} story fragments</>
        ) : (
          <>
            Showing {filteredFragments.length} of {storyFragments.length} story
            fragments
          </>
        )}
      </div>

      {/* Table or Empty State */}
      <div className="rounded-lg bg-white shadow">
        {paginatedFragments.length === 0 ? (
          <div className="p-8 text-center">
            {searchTerm ? (
              <>
                <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  No results found
                </h3>
                <p className="mt-2 text-gray-500">
                  Try a different search term.
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  No Story Fragments
                </h3>
                <p className="mt-2 text-gray-500">
                  Get started by creating your first story fragment.
                </p>
                <button
                  onClick={handleCreate}
                  className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700"
                >
                  Create Story Fragment
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 sm:px-6">
                    Title
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                    Slug
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 sm:px-6 md:table-cell">
                    Status
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 sm:px-6 md:table-cell">
                    Usage
                  </th>
                  <th className="px-3 py-3 text-right sm:px-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedFragments.map((item) => {
                  const usage = getUsageInfo(item.id);
                  const canDelete = !shouldDisableDelete(item);
                  const deleteTooltip = getDeleteTooltip(item);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 sm:px-6">
                        <div className="flex flex-col">
                          <div className="text-sm font-bold text-gray-900">
                            {item.title}
                          </div>
                          {isHomePage(item.slug) && (
                            <div className="text-xs font-bold text-cyan-600">
                              Home Page
                            </div>
                          )}
                          {/* Show slug on mobile */}
                          <div className="mt-1 text-sm text-gray-500 sm:hidden">
                            /{item.slug}
                          </div>
                          {/* Show status on mobile */}
                          <div className="mt-1 md:hidden">
                            <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-bold leading-5 text-green-800">
                              Published
                            </span>
                          </div>
                          {/* Show usage on mobile */}
                          <div className="mt-1 md:hidden">
                            {orphanState.isLoading ? (
                              <div className="text-xs text-gray-400">
                                Loading...
                              </div>
                            ) : usage.isUsed ? (
                              <div
                                className="relative"
                                onMouseEnter={() => setHoveredUsage(item.id)}
                                onMouseLeave={() => setHoveredUsage(null)}
                              >
                                <div className="flex items-center text-xs text-blue-600">
                                  <svg
                                    className="mr-1 h-4 w-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Used ({usage.usedBy.length})
                                </div>
                                {hoveredUsage === item.id && (
                                  <div className="absolute bottom-full left-0 z-10 mb-2 w-48 rounded bg-gray-900 p-2 text-xs text-white shadow-lg sm:w-64">
                                    <div className="mb-1 font-bold">
                                      Used by:
                                    </div>
                                    <div className="space-y-1">
                                      {usage.usedBy.map((dependency, index) => (
                                        <div
                                          key={index}
                                          className="text-gray-300"
                                        >
                                          {getTitleFromId(dependency)}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="absolute left-4 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">
                                Orphan
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                        /{item.slug}
                      </td>
                      <td className="hidden px-3 py-4 sm:px-6 md:table-cell">
                        <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-bold leading-5 text-green-800">
                          Published
                        </span>
                      </td>
                      <td className="hidden px-3 py-4 sm:px-6 md:table-cell">
                        {orphanState.isLoading ? (
                          <div className="text-xs text-gray-400">
                            Loading...
                          </div>
                        ) : usage.isUsed ? (
                          <div
                            className="relative"
                            onMouseEnter={() => setHoveredUsage(item.id)}
                            onMouseLeave={() => setHoveredUsage(null)}
                          >
                            <div className="flex items-center text-xs text-blue-600">
                              <svg
                                className="mr-1 h-4 w-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Used ({usage.usedBy.length})
                            </div>
                            {hoveredUsage === item.id && (
                              <div className="absolute bottom-full left-0 z-10 mb-2 w-64 rounded bg-gray-900 p-2 text-xs text-white shadow-lg">
                                <div className="mb-1 font-bold">Used by:</div>
                                <div className="space-y-1">
                                  {usage.usedBy.map((dependency, index) => (
                                    <div key={index} className="text-gray-300">
                                      {getTitleFromId(dependency)}
                                    </div>
                                  ))}
                                </div>
                                <div className="absolute left-4 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Orphan</div>
                        )}
                      </td>
                      <td className="px-3 py-4 text-right text-sm font-bold sm:px-6">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => handleView(item.slug)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(item.slug)}
                            className="text-cyan-600 hover:text-cyan-900"
                          >
                            Edit
                          </button>
                          <div className="relative">
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
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-1 justify-between sm:hidden">
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
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
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
                              'relative inline-flex items-center px-4 py-2 text-sm font-bold',
                              page === currentPage
                                ? 'z-10 bg-cyan-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
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
