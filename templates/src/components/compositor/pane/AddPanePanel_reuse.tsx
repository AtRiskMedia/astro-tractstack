import { useState, useEffect, useMemo } from 'react';
import { Combobox } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { fullContentMapStore } from '@/stores/storykeep';
import { NodesContext, getCtx } from '@/stores/nodes';
import {
  NodesSnapshotRenderer,
  type SnapshotData,
} from '@/components/compositor/preview/NodesSnapshotRenderer';
import { createEmptyStorykeep } from '@/utils/compositor/nodesHelper';
import { PaneAddMode, type StoryFragmentNode } from '@/types/compositorTypes';
import type { FullContentMapItem } from '@/types/tractstack';

interface AddPaneReUsePanelProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode) => void;
}

const AddPaneReUsePanel = ({
  nodeId,
  first,
  setMode,
}: AddPaneReUsePanelProps) => {
  const [selected, setSelected] = useState<FullContentMapItem | null>(null);
  const [previews, setPreviews] = useState<
    { ctx: NodesContext; snapshot?: SnapshotData }[]
  >([]);
  const [query, setQuery] = useState('');
  const [availablePanes, setAvailablePanes] = useState<FullContentMapItem[]>(
    []
  );

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

  useEffect(() => {
    if (!selected) {
      setPreviews([]);
      return;
    }

    const fetchPanePreview = async () => {
      try {
        const response = await fetch('/api/turso/getPaneTemplateNode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selected.id }),
        });
        const result = await response.json();
        if (!result.success || !result.data.data.templatePane) {
          console.error('Failed to fetch pane:', result.error);
          return;
        }

        // Create new context
        const ctx = new NodesContext();

        // Add root node
        ctx.addNode(createEmptyStorykeep('tmp'));

        // Get the full template pane with all its content
        const template = result.data.data.templatePane;

        // Add the template to the context properly
        ctx.addTemplatePane('tmp', template);

        // Update previews with new context
        setPreviews([{ ctx }]);
      } catch (error) {
        console.error('Error fetching pane preview:', error);
        setPreviews([]); // Clear previews on error
      }
    };

    fetchPanePreview();
  }, [selected]);

  const handlePaneReuse = async (
    selectedPaneId: string,
    nodeId: string,
    first: boolean
  ) => {
    if (!selectedPaneId) return;

    try {
      // Fetch the pane template
      const response = await fetch('/api/turso/getPaneTemplateNode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedPaneId }),
      });
      const result = await response.json();
      if (!result.success || !result.data.data.templatePane) {
        console.error('Failed to fetch pane:', result.error);
        return;
      }

      // Get the template
      const template = result.data.data.templatePane;

      // Get context and insert the pane
      const ctx = getCtx();
      const ownerId = ctx.getClosestNodeTypeFromId(nodeId, 'StoryFragment');
      const newPaneId = ctx.addTemplatePane(
        ownerId,
        template,
        nodeId,
        first ? 'before' : 'after'
      );

      if (newPaneId) {
        ctx.notifyNode(`root`);
        setMode(PaneAddMode.DEFAULT);
      }
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
              value={selected ? [selected.id] : []}
              onValueChange={(details) => {
                const selectedId = details.value[0];
                if (selectedId) {
                  const pane = availablePanes.find((p) => p.id === selectedId);
                  setSelected(pane || null);
                } else {
                  setSelected(null);
                }
              }}
              onInputValueChange={(details) => setQuery(details.inputValue)}
              loopFocus={true}
              openOnKeyPress={true}
              composite={true}
            >
              <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition-colors focus-within:border-cyan-500">
                  <Combobox.Input
                    autoComplete="off"
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                    placeholder="Search for a pane..."
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </Combobox.Trigger>
                </div>
                <Combobox.Content className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {collection.items.length === 0 ? (
                    <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                      Nothing found.
                    </div>
                  ) : (
                    collection.items.map((pane) => (
                      <Combobox.Item
                        key={pane.id}
                        item={pane}
                        className="pane-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                      >
                        <span className="block truncate">{pane.title}</span>
                        <span className="pane-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="block truncate text-sm text-gray-500">
                          {pane.slug}
                        </span>
                      </Combobox.Item>
                    ))
                  )}
                </Combobox.Content>
              </div>
            </Combobox.Root>
          </div>

          {selected && (
            <div className="flex min-w-[200px] flex-wrap gap-2">
              <button
                onClick={() => {
                  if (selected) {
                    handlePaneReuse(selected.id, nodeId, first);
                  }
                }}
                className="rounded bg-cyan-600 px-3 py-2 text-sm text-white transition-colors hover:bg-cyan-700 focus:bg-cyan-700"
              >
                Use Selected Pane
              </button>
              <button
                onClick={() => setSelected(null)}
                className="rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 focus:bg-gray-200"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="mt-4">
          <h3 className="font-action px-3.5 pb-1.5 pt-4 text-xl font-bold text-black">
            Preview of selected pane:
          </h3>
          <div className="grid grid-cols-1 gap-4 p-2">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="bg-mywhite group relative w-full cursor-pointer rounded-sm shadow-inner transition-all duration-200"
                style={{
                  ...(!preview.snapshot ? { minHeight: '200px' } : {}),
                }}
              >
                {!preview.snapshot && (
                  <NodesSnapshotRenderer
                    ctx={preview.ctx}
                    forceRegenerate={false}
                    onComplete={(data) => {
                      setPreviews((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, snapshot: data } : p
                        )
                      );
                    }}
                  />
                )}
                {preview.snapshot && (
                  <div className="p-0.5">
                    <img
                      src={preview.snapshot.imageData}
                      alt={`Preview of ${selected.title}`}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPaneReUsePanel;
