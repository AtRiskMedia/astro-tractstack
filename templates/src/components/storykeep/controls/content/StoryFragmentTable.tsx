import { useState, useMemo } from 'react';
import { classNames } from '../../../../utils/helpers';
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

  const itemsPerPage = 20;

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
    } catch (error) {
      console.error('Failed to delete Story Fragment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Story Fragments
          </h2>
          <p className="text-sm text-gray-600">
            All web pages ({filteredFragments.length}{' '}
            total)
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={isLoading}
          className={classNames(
            'rounded-md px-4 py-2 text-sm font-medium text-white',
            isLoading
              ? 'cursor-not-allowed bg-gray-400'
              : 'bg-cyan-600 hover:bg-cyan-700'
          )}
        >
          + Create Story Fragment
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="max-w-md flex-1">
          <input
            type="text"
            placeholder="Search by title or slug..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-cyan-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow">
        {filteredFragments.length === 0 ? (
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
                <h3 className="text-lg font-medium text-gray-900">
                  No results found
                </h3>
                <p className="mt-2 text-gray-500">
                  No story fragments match "{searchTerm}". Try a different
                  search term.
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
                <h3 className="text-lg font-medium text-gray-900">
                  No Story Fragments
                </h3>
                <p className="mt-2 text-gray-500">
                  Get started by creating your first story fragment.
                </p>
                <button
                  onClick={handleCreate}
                  className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                >
                  Create Story Fragment
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginatedFragments.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.title}
                          </div>
                          {item.slug === homeSlug && (
                            <div className="text-xs font-medium text-cyan-600">
                              Home Page
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-500">/{item.slug}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                        Published
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
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
                        {item.slug !== homeSlug && (
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            className="text-red-600 hover:text-red-900"
                            disabled={isLoading}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                        'relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium',
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
                        'relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium',
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
                        <span className="font-medium">{startIndex + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(
                            startIndex + itemsPerPage,
                            filteredFragments.length
                          )}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">
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

                        {/* Page Numbers */}
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={classNames(
                              'relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0',
                              currentPage === page
                                ? 'bg-cyan-600 text-white'
                                : 'text-gray-900'
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
