import { useState, useEffect, useMemo } from 'react';
import { Combobox } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronUpDownIcon from '@heroicons/react/20/solid/ChevronUpDownIcon';
import { fullContentMapStore } from '@/stores/storykeep';
import { NodesContext, getCtx } from '@/stores/nodes';
import {
  PaneSnapshotGenerator,
  type SnapshotData,
} from '@/components/compositor/preview/PaneSnapshotGenerator';
import { PaneAddMode, type StoryFragmentNode } from '@/types/compositorTypes';
import type { FullContentMapItem } from '@/types/tractstack';

interface AddPaneReUsePanelProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode) => void;
}

interface PreviewItem {
  ctx: NodesContext;
  snapshot?: SnapshotData;
  htmlFragment?: string;
  fragmentError?: string;
  pane: FullContentMapItem;
  index: number;
}

const ITEMS_PER_PAGE = 4;

const AddPaneReUsePanel = ({
  nodeId,
  first,
  setMode,
}: AddPaneReUsePanelProps) => {
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [query, setQuery] = useState('');
  const [availablePanes, setAvailablePanes] = useState<FullContentMapItem[]>(
    []
  );
  const [fragmentsLoaded, setFragmentsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    const ctx = getCtx();
    const storyfragmentId = ctx.getClosestNodeTypeFromId(
      nodeId,
      'StoryFragment'
    );
    const storyfragmentNode = ctx.allNodes
      .get()
      .get(storyfragmentId) as StoryFragmentNode;
    const usedPaneIds = storyfragmentNode?.paneIds || [];

    const allPanes = fullContentMapStore
      .get()
      .filter((item) => item.type === 'Pane');
    const unusedPanes = allPanes.filter(
      (pane) => !usedPaneIds.includes(pane.id)
    );
    setAvailablePanes(unusedPanes);
  }, [nodeId]);

  // Create collection for Ark UI Combobox
  const collection = useMemo(() => {
    const filteredPanes =
      query === ''
        ? availablePanes
        : availablePanes.filter(
            (pane) =>
              pane.title.toLowerCase().includes(query.toLowerCase()) ||
              pane.slug.toLowerCase().includes(query.toLowerCase())
          );

    return createListCollection({
      items: filteredPanes,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.title,
    });
  }, [availablePanes, query]);

  // Create previews from filtered panes
  useEffect(() => {
    const filteredPanes =
      query === ''
        ? availablePanes
        : availablePanes.filter(
            (pane) =>
              pane.title.toLowerCase().includes(query.toLowerCase()) ||
              pane.slug.toLowerCase().includes(query.toLowerCase())
          );

    const newPreviews = filteredPanes.map((pane, index) => ({
      ctx: new NodesContext(),
      pane,
      index,
      htmlFragment: undefined,
      fragmentError: undefined,
    }));

    setPreviews(newPreviews);
    setCurrentPage(0);
    setRenderedPages(new Set([0]));
    setFragmentsLoaded(false);
  }, [availablePanes, query]);

  const totalPages = Math.ceil(previews.length / ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      setRenderedPages((prev) => new Set([...prev, newPage]));
      setFragmentsLoaded(false);
    }
  };

  const visiblePreviews = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return previews.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [previews, currentPage]);

  // Fetch fragments for visible panes
  useEffect(() => {
    if (visiblePreviews.length === 0 || fragmentsLoaded) return;

    const fetchFragments = async () => {
      try {
        const paneIds = visiblePreviews.map((preview) => preview.pane.id);

        const goBackend =
          import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
        const response = await fetch(`${goBackend}/api/v1/fragments/panes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': import.meta.env.PUBLIC_TENANTID || 'default',
          },
          body: JSON.stringify({ paneIds }),
        });

        if (!response.ok) {
          throw new Error(`Fragment API failed: ${response.status}`);
        }

        const data = await response.json();

        setPreviews((prevPreviews) => {
          const updated = [...prevPreviews];
          visiblePreviews.forEach((visiblePreview) => {
            const globalIndex = prevPreviews.findIndex(
              (p) => p.pane.id === visiblePreview.pane.id
            );
            if (globalIndex !== -1) {
              updated[globalIndex] = {
                ...updated[globalIndex],
                htmlFragment: data.fragments?.[visiblePreview.pane.id] || '',
                fragmentError:
                  data.errors?.[visiblePreview.pane.id] || undefined,
              };
            }
          });
          return updated;
        });

        setFragmentsLoaded(true);
      } catch (error) {
        console.error('Failed to fetch fragments:', error);
        setPreviews((prevPreviews) => {
          const updated = [...prevPreviews];
          visiblePreviews.forEach((visiblePreview) => {
            const globalIndex = prevPreviews.findIndex(
              (p) => p.pane.id === visiblePreview.pane.id
            );
            if (globalIndex !== -1) {
              updated[globalIndex] = {
                ...updated[globalIndex],
                fragmentError:
                  error instanceof Error ? error.message : 'Unknown error',
              };
            }
          });
          return updated;
        });
        setFragmentsLoaded(true);
      }
    };

    fetchFragments();
  }, [visiblePreviews, fragmentsLoaded]);

  const handleSnapshotComplete = (id: string, snapshot: SnapshotData) => {
    const paneId = id.replace('reuse-', '');
    setPreviews((prevPreviews) => {
      return prevPreviews.map((preview) =>
        preview.pane.id === paneId ? { ...preview, snapshot } : preview
      );
    });
  };

  const handlePaneReuse = async (
    selectedPaneId: string,
    nodeId: string,
    first: boolean
  ) => {
    if (!selectedPaneId) return;

    try {
      const goBackend =
        import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
      const response = await fetch(
        `${goBackend}/api/v1/nodes/panes/${selectedPaneId}/template`,
        {
          headers: {
            'X-Tenant-ID': import.meta.env.PUBLIC_TENANTID || 'default',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Template API failed: ${response.status}`);
      }

      const templateData = await response.json();
      const ctx = getCtx();

      // Find storyfragment
      const storyfragmentId = ctx.getClosestNodeTypeFromId(
        nodeId,
        'StoryFragment'
      );
      const storyFragmentNode = ctx.allNodes
        .get()
        .get(storyfragmentId) as StoryFragmentNode;

      if (
        !storyFragmentNode ||
        storyFragmentNode.nodeType !== 'StoryFragment'
      ) {
        throw new Error('No storyfragment found');
      }

      // Set pane parentId
      templateData.paneNode.parentId = storyfragmentId;

      let specificIdx = -1;
      let elIdx = -1;
      const location = first ? 'before' : 'after';

      specificIdx = storyFragmentNode.paneIds.indexOf(nodeId);
      elIdx = specificIdx;
      if (elIdx === -1) {
        storyFragmentNode.paneIds.push(templateData.paneNode.id);
      } else {
        if (location === 'before') {
          storyFragmentNode.paneIds.splice(elIdx, 0, templateData.paneNode.id);
          specificIdx = Math.max(0, specificIdx - 1);
        } else {
          storyFragmentNode.paneIds.splice(
            elIdx + 1,
            0,
            templateData.paneNode.id
          );
          specificIdx = Math.min(
            specificIdx + 1,
            storyFragmentNode.paneIds.length
          );
        }
      }
      storyFragmentNode.isChanged = true;

      // Add nodes using exact same pattern as addTemplatePane
      ctx.addNode(templateData.paneNode);
      ctx.linkChildToParent(
        templateData.paneNode.id,
        templateData.paneNode.parentId,
        specificIdx
      );
      ctx.addNodes(templateData.childNodes);
      ctx.notifyNode(storyfragmentId);

      setMode(PaneAddMode.DEFAULT);
    } catch (error) {
      console.error('Error reusing pane:', error);
    }
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .pane-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .pane-item[data-highlighted] .pane-indicator {
      color: white;
    }
    .pane-item[data-state="checked"] .pane-indicator {
      display: flex;
    }
    .pane-item .pane-indicator {
      display: none;
    }
    .pane-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="p-0.5 shadow-inner">
      <style>{comboboxItemStyles}</style>
      <div className="w-full rounded-md bg-white p-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[200px] flex-wrap items-center gap-2">
            <button
              onClick={() => setMode(PaneAddMode.DEFAULT)}
              className="w-fit flex-none rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200 focus:bg-gray-200"
            >
              ← Go Back
            </button>

            <div className="font-action flex-none rounded px-2 py-2.5 text-sm font-bold text-cyan-700 shadow-sm">
              Re-use Existing Pane
            </div>
          </div>

          <div className="min-w-[300px] flex-1">
            <Combobox.Root
              collection={collection}
              value={[]}
              onValueChange={() => {}}
              onInputValueChange={(details) => setQuery(details.inputValue)}
            >
              <div className="relative">
                <Combobox.Control className="relative w-full">
                  <Combobox.Input
                    placeholder="Type to filter panes..."
                    className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </Combobox.Trigger>
                </Combobox.Control>
              </div>
            </Combobox.Root>
          </div>
        </div>
      </div>

      <h3 className="font-action px-3.5 pb-1.5 pt-4 text-xl font-bold text-black">
        Click on a pane to reuse:
      </h3>

      <div className="grid grid-cols-2 gap-6 p-2 xl:grid-cols-3">
        {visiblePreviews.map((preview) => (
          <div key={preview.pane.id} className="flex flex-col items-center">
            <div
              onClick={() => handlePaneReuse(preview.pane.id, nodeId, first)}
              className="hover:outline-solid bg-mywhite group relative w-full cursor-pointer rounded-sm shadow-inner transition-all duration-200 hover:outline hover:outline-4"
              style={{
                ...(!preview.snapshot ? { minHeight: '75px' } : {}),
              }}
            >
              {renderedPages.has(currentPage) && !fragmentsLoaded && (
                <div className="flex h-24 items-center justify-center">
                  <div className="text-gray-500">Loading...</div>
                </div>
              )}

              {fragmentsLoaded && preview.fragmentError && (
                <div className="flex h-24 items-center justify-center">
                  <div className="text-red-500">Preview error</div>
                </div>
              )}

              {fragmentsLoaded &&
                preview.htmlFragment &&
                !preview.snapshot &&
                !preview.fragmentError && (
                  <PaneSnapshotGenerator
                    id={`reuse-${preview.pane.id}`}
                    htmlString={preview.htmlFragment}
                    onComplete={handleSnapshotComplete}
                    onError={(id, error) =>
                      console.error(`Snapshot error for ${id}:`, error)
                    }
                    outputWidth={400}
                  />
                )}

              {preview.snapshot && (
                <div className="mb-4 p-3.5">
                  <img
                    src={preview.snapshot.imageData}
                    alt={`Preview of ${preview.pane.title}`}
                    className="w-full"
                  />
                </div>
              )}
            </div>
            <p className="bg-mydarkgrey mt-2 w-full break-words p-2 text-center text-sm text-white">
              {preview.pane.title}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-2 mt-4 flex items-center justify-center gap-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200 focus:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <div className="flex gap-1">
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => handlePageChange(index)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                currentPage === index
                  ? 'bg-cyan-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200 focus:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AddPaneReUsePanel;
