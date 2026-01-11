import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import LockClosedIcon from '@heroicons/react/24/outline/LockClosedIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { Toggle } from '@ark-ui/react/toggle';
import { orphanAnalysisStore } from '@/stores/orphanAnalysis';
import {
  PaneSnapshotGenerator,
  type SnapshotData,
} from '@/components/compositor/preview/PaneSnapshotGenerator';
import { usePaneFragments } from '@/hooks/usePaneFragments';
import { TractStackAPI } from '@/utils/api';
import type { FullContentMapItem } from '@/types/tractstack';

interface PaneTableProps {
  fullContentMap: FullContentMapItem[];
  onRefresh: () => void;
}

interface PanePreviewItem {
  pane: FullContentMapItem;
  snapshot?: SnapshotData;
}

const ITEMS_PER_PAGE = 6;

const DeletingModal = ({ count }: { count: number }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-8 shadow-xl">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900">Deleting Content</h3>
        <p className="text-gray-500">Removing {count} pane(s)...</p>
      </div>
    </div>
  </div>
);

const PaneTable = ({ fullContentMap, onRefresh }: PaneTableProps) => {
  const orphanState = useStore(orphanAnalysisStore);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [previews, setPreviews] = useState<PanePreviewItem[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOnlyUnused, setShowOnlyUnused] = useState(false);

  const tenantId =
    window.TRACTSTACK_CONFIG?.tenantId ||
    import.meta.env.PUBLIC_TENANTID ||
    'default';

  const isOrphan = (id: string) => {
    if (!orphanState.data?.panes) return false;
    const deps = orphanState.data.panes[id];
    return deps && deps.length === 0;
  };

  const allPanes = useMemo(
    () => fullContentMap.filter((item) => item.type === 'Pane'),
    [fullContentMap]
  );

  const filteredPanes = useMemo(() => {
    if (!showOnlyUnused) return allPanes;
    return allPanes.filter((p) => isOrphan(p.id));
  }, [allPanes, showOnlyUnused, orphanState.data]);

  useEffect(() => {
    setPreviews(filteredPanes.map((pane) => ({ pane })));
    setCurrentPage(0);
    setSelectedIds(new Set());
  }, [filteredPanes]);

  const totalPages = Math.ceil(previews.length / ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const visiblePreviews = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return previews.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [previews, currentPage]);

  const visiblePaneIds = useMemo(
    () => visiblePreviews.map((p) => p.pane.id),
    [visiblePreviews]
  );

  const {
    fragments,
    errors,
    isLoading: fragmentsLoading,
  } = usePaneFragments(visiblePaneIds);

  const handleSnapshotComplete = (id: string, snapshot: SnapshotData) => {
    const paneId = id.replace('table-', '');
    setPreviews((prev) =>
      prev.map((item) =>
        item.pane.id === paneId ? { ...item, snapshot } : item
      )
    );
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const unusedCount = useMemo(() => {
    return allPanes.filter((p) => isOrphan(p.id)).length;
  }, [allPanes, orphanState.data]);

  const handleSelectAllUnused = () => {
    const newSet = new Set(selectedIds);
    allPanes.forEach((p) => {
      if (isOrphan(p.id)) {
        newSet.add(p.id);
      }
    });
    setSelectedIds(newSet);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} pane(s)? This action cannot be undone.`
      )
    )
      return;

    setIsDeleting(true);
    try {
      const api = new TractStackAPI(tenantId);
      const response = await api.request('/api/v1/nodes/panes/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ paneIds: Array.from(selectedIds) }),
      });

      if (response.success) {
        setSelectedIds(new Set());
        onRefresh();
      } else {
        alert(`Failed to delete panes: ${response.error}`);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('An error occurred while deleting panes.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {isDeleting && <DeletingModal count={selectedIds.size} />}

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700">
              {selectedIds.size} of {filteredPanes.length} Selected
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={handleClearSelection}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 border-l border-gray-300 pl-6">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Filter:
            </span>
            <Toggle.Root
              pressed={showOnlyUnused}
              onPressedChange={setShowOnlyUnused}
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold shadow-sm transition-all ${
                showOnlyUnused
                  ? 'border-cyan-600 bg-cyan-600 text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Show Unused Only ({unusedCount})
            </Toggle.Root>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAllUnused}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
            title={`Select all ${unusedCount} unused panes`}
          >
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            Select All Unused
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
              Delete ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {previews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-white py-12">
          <p className="text-gray-500">
            No panes found matching the current filter.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-start gap-4 p-2">
          {visiblePreviews.map((item) => {
            const orphan = isOrphan(item.pane.id);
            const isSelected = selectedIds.has(item.pane.id);

            return (
              <div
                key={item.pane.id}
                className={`relative flex min-w-72 flex-1 basis-1/4 flex-col rounded-lg border-2 bg-white shadow-sm transition-all ${
                  isSelected
                    ? 'border-cyan-600 ring-2 ring-cyan-100'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                <div className="absolute right-2 top-2 z-10">
                  {orphan ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-transform hover:scale-110">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(item.pane.id)}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </div>
                  ) : (
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 shadow-md"
                      title="This pane is in use and cannot be deleted"
                    >
                      <LockClosedIcon className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="relative w-full overflow-hidden rounded-t-lg bg-gray-50">
                  {fragmentsLoading && !fragments[item.pane.id] && (
                    <div className="flex h-24 items-center justify-center text-gray-400">
                      <span className="text-xs">Loading...</span>
                    </div>
                  )}

                  {errors[item.pane.id] && (
                    <div className="flex h-24 items-center justify-center text-red-400">
                      <span className="text-xs">Preview Error</span>
                    </div>
                  )}

                  {fragments[item.pane.id] &&
                    !item.snapshot &&
                    !errors[item.pane.id] && (
                      <div className="max-h-32 overflow-hidden">
                        <PaneSnapshotGenerator
                          id={`table-${item.pane.id}`}
                          htmlString={fragments[item.pane.id]}
                          onComplete={handleSnapshotComplete}
                          outputWidth={400}
                        />
                      </div>
                    )}

                  {item.snapshot && (
                    <img
                      src={item.snapshot.imageData}
                      alt={item.pane.title}
                      className="max-h-32 w-full object-cover object-top"
                    />
                  )}
                </div>

                <div className="bg-gray-50 p-2">
                  <h4
                    className="truncate text-xs font-bold text-gray-900"
                    title={item.pane.title}
                  >
                    {item.pane.title}
                  </h4>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span
                      className="truncate font-mono text-base text-gray-500"
                      title={item.pane.slug}
                    >
                      /{item.pane.slug}
                    </span>
                    {!orphan && (
                      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-base text-green-800">
                        In Use
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="flex items-center text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            className="rounded border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PaneTable;
