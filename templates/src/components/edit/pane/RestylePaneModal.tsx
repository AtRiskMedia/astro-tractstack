import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@nanostores/react';
import {
  Dialog,
  Select,
  Combobox,
  Pagination,
  Portal,
  type SelectValueChangeDetails,
  type ComboboxInputValueChangeDetails,
  type PaginationPageChangeDetails,
} from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { selectionStore } from '@/stores/selection';
import { getCtx, NodesContext } from '@/stores/nodes';
import { createEmptyStorykeep } from '@/utils/compositor/nodesHelper';
import { brandConfigStore } from '@/stores/storykeep';
import {
  extractPaneCopy,
  mergeCopyIntoTemplate,
  convertStorageToLiveTemplate,
} from '@/utils/compositor/designLibraryHelper';
import type {
  PaneNode,
  StoragePane,
  TemplatePane,
  TemplateMarkdown,
  BaseNode,
} from '@/types/compositorTypes';
import type { DesignLibraryEntry } from '@/types/tractstack';
import {
  PaneSnapshotGenerator,
  type SnapshotData,
} from '@/components/compositor/preview/PaneSnapshotGenerator';
import {
  PanesPreviewGenerator,
  type PanePreviewRequest,
  type PaneFragmentResult,
} from '@/components/compositor/preview/PanesPreviewGenerator';
import { classNames } from '@/utils/helpers';

const PAGE_SIZE = 6;
const VERBOSE = false;

interface TemplatePreviewItemProps {
  template: TemplatePane;
  onClick: () => void;
}

const TemplatePreviewItem = ({
  template,
  onClick,
}: TemplatePreviewItemProps) => {
  const [previewState, setPreviewState] = useState<{
    htmlFragment?: string;
    snapshot?: SnapshotData;
    error?: string;
  } | null>(null);

  const fragmentRequest = useMemo((): PanePreviewRequest[] => {
    const ctx = new NodesContext();
    ctx.addNode(createEmptyStorykeep('tmp'));
    ctx.addTemplatePane('tmp', template);
    return [{ id: template.id, ctx }];
  }, [template]);

  const handleFragmentComplete = (results: PaneFragmentResult[]) => {
    const result = results[0];
    if (result?.htmlString) {
      setPreviewState({ htmlFragment: result.htmlString });
    } else {
      setPreviewState({
        error: result?.error || 'Failed to generate HTML fragment.',
      });
    }
  };

  const handleSnapshotComplete = (data: SnapshotData) => {
    setPreviewState((prev) => (prev ? { ...prev, snapshot: data } : null));
  };

  return (
    <div
      className="cursor-pointer rounded-lg border bg-white shadow-sm transition-all hover:shadow-lg"
      onClick={onClick}
    >
      <div className="h-64 overflow-hidden rounded-t-lg border-b bg-gray-50">
        {!previewState && (
          <div className="h-full w-full animate-pulse bg-gray-200" />
        )}

        {previewState?.error && (
          <div className="flex h-full items-center justify-center p-4">
            <p className="text-xs text-red-500">{previewState.error}</p>
          </div>
        )}

        {fragmentRequest.length > 0 && !previewState?.htmlFragment && (
          <PanesPreviewGenerator
            requests={fragmentRequest}
            onComplete={handleFragmentComplete}
            onError={(err) => setPreviewState({ error: err })}
          />
        )}

        {previewState?.htmlFragment && !previewState.snapshot && (
          <PaneSnapshotGenerator
            id={template.id}
            htmlString={previewState.htmlFragment}
            outputWidth={800}
            onComplete={(_id, data) => handleSnapshotComplete(data)}
            onError={(_id, err) =>
              setPreviewState((prev) =>
                prev ? { ...prev, error: err } : { error: err }
              )
            }
          />
        )}

        {previewState?.snapshot && (
          <img
            src={previewState.snapshot.imageData}
            alt={`Preview for ${template.title}`}
            className="block w-full"
          />
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-bold" title={template.title}>
          {template.title}
        </h3>
        <p className="text-sm text-gray-600">
          {(template as any).category || 'Uncategorized'}
        </p>
      </div>
    </div>
  );
};

export const RestylePaneModal = () => {
  const ctx = getCtx();
  const { isRestyleModalOpen, paneToRestyleId } = useStore(selectionStore, {
    keys: ['isRestyleModalOpen', 'paneToRestyleId'],
  });
  const designLibrary = brandConfigStore.get()?.DESIGN_LIBRARY || [];
  const contentRef = useRef<HTMLDivElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const categories = useMemo(() => {
    const allCategories = new Set(
      designLibrary.map((entry: DesignLibraryEntry) => entry.category)
    );
    return ['all', ...Array.from(allCategories)];
  }, [designLibrary]);

  const [targetMarkdownCount, setTargetMarkdownCount] = useState<number>(0);

  useEffect(() => {
    if (!paneToRestyleId || !isRestyleModalOpen) {
      setTargetMarkdownCount(0);
      return;
    }
    const paneChildIds = ctx.getChildNodeIDs(paneToRestyleId);
    const nodesMap = ctx.allNodes.get();
    const gridNodeId = paneChildIds.find(
      (id) => nodesMap.get(id)?.nodeType === 'GridLayoutNode'
    );
    if (gridNodeId) {
      const columns = ctx.getChildNodeIDs(gridNodeId);
      setTargetMarkdownCount(columns.length);
      return;
    }
    const markdownNodeId = paneChildIds.find(
      (id) => nodesMap.get(id)?.nodeType === 'Markdown'
    );
    if (markdownNodeId) {
      setTargetMarkdownCount(1);
      return;
    }
    setTargetMarkdownCount(0);
  }, [paneToRestyleId, isRestyleModalOpen]);

  const originalPaneData = useMemo(() => {
    if (!paneToRestyleId) return null;
    const paneNode = ctx.allNodes.get().get(paneToRestyleId) as PaneNode;
    if (!paneNode) {
      console.error(
        'DEBUG: originalPaneData - FAILED. PaneNode not found for id:',
        paneToRestyleId
      );
      return null;
    }

    const copy = extractPaneCopy(paneNode);

    if (VERBOSE)
      console.log('DEBUG: originalPaneData (SUCCESS)', {
        paneId: paneNode.id,
        extractedCopy: copy,
      });

    return { paneNode, copy };
  }, [paneToRestyleId, isRestyleModalOpen]);

  const filteredEntries = useMemo(() => {
    return designLibrary.filter(
      (entry: DesignLibraryEntry) =>
        (selectedCategory === 'all' || entry.category === selectedCategory) &&
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        entry.markdownCount === targetMarkdownCount &&
        !entry.locked
    );
  }, [designLibrary, selectedCategory, searchTerm, targetMarkdownCount]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredEntries.slice(start, end);
  }, [filteredEntries, currentPage]);

  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);

  const mergedTemplates = useMemo<
    { entry: DesignLibraryEntry; template: TemplatePane }[]
  >(() => {
    if (!originalPaneData) return [];

    return paginatedEntries.map((entry: DesignLibraryEntry) => {
      const mergedStoragePane: StoragePane = mergeCopyIntoTemplate(
        entry.template,
        originalPaneData.copy
      );
      const liveTemplatePane: TemplatePane =
        convertStorageToLiveTemplate(mergedStoragePane);
      liveTemplatePane.title = entry.title;
      (liveTemplatePane as any).category = entry.category;
      return { entry, template: liveTemplatePane };
    });
  }, [paginatedEntries, originalPaneData]);

  if (VERBOSE)
    console.log('DEBUG: Final mergedTemplates array:', mergedTemplates);

  const handleClose = () => {
    selectionStore.setKey('isRestyleModalOpen', false);
    selectionStore.setKey('paneToRestyleId', null);
    setCurrentPage(1);
    setSearchTerm('');
    setSelectedCategory('all');
  };

  const handleDialogStateChange = (details: { open: boolean }) => {
    if (!details.open) {
      handleClose();
    }
  };

  const handleSelectTemplate = (template: TemplatePane) => {
    if (!originalPaneData) {
      return;
    }

    const originalPane = originalPaneData.paneNode;
    const originalPaneId = originalPane.id;

    ctx.deleteChildren(originalPaneId);

    const newNodesToAdd: BaseNode[] = [];
    const newMarkdown = template.markdown as TemplateMarkdown | undefined;
    const newGridLayout = template.gridLayout;
    const newBgPane = template.bgPane;

    if (newMarkdown) {
      newMarkdown.parentId = originalPaneId;
      newNodesToAdd.push(newMarkdown);
      if (newMarkdown.nodes) {
        newNodesToAdd.push(...newMarkdown.nodes);
      }
    }

    if (newGridLayout) {
      newGridLayout.parentId = originalPaneId;
      newNodesToAdd.push(newGridLayout);

      if (newGridLayout.nodes) {
        newGridLayout.nodes.forEach((column) => {
          column.parentId = newGridLayout.id;
          newNodesToAdd.push(column);

          if (column.nodes) {
            newNodesToAdd.push(...column.nodes);
          }
        });
      }
    }

    if (newBgPane) {
      newBgPane.parentId = originalPaneId;
      newNodesToAdd.push(newBgPane);
    }

    ctx.addNodes(newNodesToAdd);

    const paneToUpdate = ctx.allNodes.get().get(originalPaneId) as PaneNode;

    if (!paneToUpdate) {
      return;
    }

    paneToUpdate.bgColour = template.bgColour;
    paneToUpdate.isDecorative = template.isDecorative;
    paneToUpdate.heightOffsetDesktop = template.heightOffsetDesktop;
    paneToUpdate.heightOffsetMobile = template.heightOffsetMobile;
    paneToUpdate.heightOffsetTablet = template.heightOffsetTablet;
    paneToUpdate.heightRatioDesktop = template.heightRatioDesktop;
    paneToUpdate.heightRatioMobile = template.heightRatioMobile;
    paneToUpdate.heightRatioTablet = template.heightRatioTablet;
    paneToUpdate.isChanged = true;

    ctx.modifyNodes([paneToUpdate]);
    ctx.notifyNode('root');

    handleClose();
  };

  const comboboxCollection = useMemo(
    () =>
      createListCollection({
        items: filteredEntries,
        itemToValue: (item) => item.title,
        itemToString: (item) => item.title,
      }),
    [filteredEntries]
  );

  const selectCollection = useMemo(
    () =>
      createListCollection({
        items: categories.map((c) => ({ label: c, value: c })),
        itemToValue: (item) => item.value,
        itemToString: (item) => item.label,
      }),
    [categories]
  );

  return (
    <Dialog.Root
      open={isRestyleModalOpen}
      onOpenChange={handleDialogStateChange}
      modal={true}
      preventScroll={true}
    >
      <Dialog.Backdrop className="z-103 fixed inset-0 bg-black bg-opacity-75" />
      <Dialog.Positioner className="z-104 fixed inset-0 flex items-center justify-center">
        <Dialog.Content
          ref={contentRef}
          className="flex max-w-5xl flex-col rounded-lg bg-white shadow-2xl xl:max-w-7xl"
          style={{ maxHeight: '90vh', width: '90vw' }}
        >
          <header className="flex items-center justify-between border-b p-4">
            <Dialog.Title className="text-xl font-bold">
              Restyle Pane from Design Library
            </Dialog.Title>
            <Dialog.CloseTrigger
              type="button"
              className="rounded-full p-1 text-gray-600 hover:bg-gray-100"
            >
              <XMarkIcon className="h-6 w-6" />
            </Dialog.CloseTrigger>
          </header>

          <nav className="flex items-center gap-x-4 border-b bg-gray-50 p-4">
            <Select.Root
              collection={selectCollection}
              value={[selectedCategory]}
              onValueChange={(details: SelectValueChangeDetails) =>
                setSelectedCategory(details.value[0])
              }
              className="w-48"
              positioning={{ gutter: 4 }}
            >
              <Select.Label className="mb-1 text-sm font-bold">
                Category
              </Select.Label>
              <Select.Control>
                <Select.Trigger className="flex w-full items-center justify-between rounded border bg-white p-2 text-left">
                  <Select.ValueText />
                  <Select.Indicator>▼</Select.Indicator>
                </Select.Trigger>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content className="z-105 rounded border bg-white shadow-lg">
                    {categories.map((c) => (
                      <Select.Item
                        key={c}
                        item={{ label: c, value: c }}
                        className="cursor-pointer p-2 hover:bg-gray-100"
                      >
                        <Select.ItemText>{c}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>

            <Combobox.Root
              collection={comboboxCollection}
              onInputValueChange={(e: ComboboxInputValueChangeDetails) =>
                setSearchTerm(e.inputValue)
              }
              className="flex-1"
              positioning={{ gutter: 4 }}
            >
              <Combobox.Label className="mb-1 text-sm font-bold">
                Filter by Title
              </Combobox.Label>
              <Combobox.Control>
                <Combobox.Input
                  placeholder="Search by title..."
                  className="w-full rounded border p-2"
                />
              </Combobox.Control>
              <Portal>
                <Combobox.Positioner>
                  <Combobox.Content className="z-105 rounded border bg-white shadow-lg">
                    {filteredEntries.map((entry: DesignLibraryEntry) => (
                      <Combobox.Item
                        key={entry.title}
                        item={entry}
                        className="cursor-pointer p-2 hover:bg-gray-100"
                      >
                        <Combobox.ItemText>{entry.title}</Combobox.ItemText>
                      </Combobox.Item>
                    ))}
                  </Combobox.Content>
                </Combobox.Positioner>
              </Portal>
            </Combobox.Root>
          </nav>

          <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
            {mergedTemplates.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">No designs found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {mergedTemplates.map(({ template }) => (
                  <TemplatePreviewItem
                    key={template.id}
                    template={template}
                    onClick={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            )}
          </main>

          {totalPages > 1 && (
            <footer className="flex items-center justify-center border-t p-4">
              <Pagination.Root
                count={totalPages * PAGE_SIZE}
                pageSize={PAGE_SIZE}
                siblingCount={1}
                page={currentPage}
                onPageChange={(details: PaginationPageChangeDetails) =>
                  setCurrentPage(details.page)
                }
                className="flex items-center gap-x-2"
              >
                <Pagination.PrevTrigger
                  type="button"
                  className="rounded p-2 text-sm hover:bg-gray-100 disabled:text-gray-400"
                  disabled={currentPage === 1}
                >
                  Previous
                </Pagination.PrevTrigger>
                <Pagination.Context>
                  {(pagination) =>
                    pagination.pages.map((page, index: number) =>
                      page.type === 'page' ? (
                        <Pagination.Item
                          key={index}
                          {...page}
                          type="page"
                          className={classNames(
                            'flex h-9 w-9 items-center justify-center rounded text-sm',
                            page.value === currentPage
                              ? 'bg-blue-600 font-bold text-white'
                              : 'hover:bg-gray-100'
                          )}
                        >
                          {page.value}
                        </Pagination.Item>
                      ) : (
                        <Pagination.Ellipsis
                          key={index}
                          index={index}
                          className="px-2 text-sm"
                        >
                          ...
                        </Pagination.Ellipsis>
                      )
                    )
                  }
                </Pagination.Context>
                <Pagination.NextTrigger
                  type="button"
                  className="rounded p-2 text-sm hover:bg-gray-100 disabled:text-gray-400"
                  disabled={currentPage === totalPages}
                >
                  Next
                </Pagination.NextTrigger>
              </Pagination.Root>
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
