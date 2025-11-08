import { useState, useMemo } from 'react';
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
import {
  extractPaneCopy,
  mergeCopyIntoTemplate,
  convertStorageToLiveTemplate,
} from '@/utils/compositor/designLibraryHelper';
import type {
  PaneNode,
  StoragePane,
  TemplatePane,
  TemplateMarkdown, // Added import
  BaseNode, // Added import
} from '@/types/compositorTypes';
import type { BrandConfig, DesignLibraryEntry } from '@/types/tractstack';
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
  config: BrandConfig;
  onClick: () => void;
}

const TemplatePreviewItem = ({
  template,
  config,
  onClick,
}: TemplatePreviewItemProps) => {
  const [previewState, setPreviewState] = useState<{
    htmlFragment?: string;
    snapshot?: SnapshotData;
    error?: string;
  } | null>(null);

  const fragmentRequest = useMemo((): PanePreviewRequest[] => {
    // This preview logic is correct: it creates a *temporary* context.
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
            config={config}
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

interface RestylePaneModalProps {
  config: BrandConfig;
}

export const RestylePaneModal = ({ config }: RestylePaneModalProps) => {
  const ctx = getCtx();
  const { isRestyleModalOpen, paneToRestyleId } = useStore(selectionStore, {
    keys: ['isRestyleModalOpen', 'paneToRestyleId'],
  });
  const designLibrary = config?.DESIGN_LIBRARY || [];

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const categories = useMemo(() => {
    const allCategories = new Set(
      designLibrary.map((entry: DesignLibraryEntry) => entry.category)
    );
    return ['all', ...Array.from(allCategories)];
  }, [designLibrary]);

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
        entry.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [designLibrary, selectedCategory, searchTerm]);

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

  const handleSelectTemplate = (template: TemplatePane) => {
    if (VERBOSE)
      console.log(
        '%cDEBUG: handleSelectTemplate CLICKED (Hollow & Replace)',
        'color: #00A; font-weight: bold;',
        {
          templateToApply: template,
          originalPaneData: originalPaneData,
        }
      );

    if (!originalPaneData) {
      console.error(
        '%cDEBUG: handleSelectTemplate FAILED: originalPaneData is null.',
        'color: red; font-weight: bold;'
      );
      return;
    }

    const originalPane = originalPaneData.paneNode;
    const originalPaneId = originalPane.id;

    if (VERBOSE)
      console.log(
        `%cDEBUG: STEP 1 - HOLLOWING OUT original pane ${originalPaneId}`,
        'color: #A0A; font-weight: bold;'
      );
    const oldChildrenNodes = ctx
      .getChildNodeIDs(originalPaneId)
      .map((id) => ctx.allNodes.get().get(id));
    if (VERBOSE)
      console.log(
        '%cDEBUG: Original pane children BEFORE delete:',
        oldChildrenNodes
      );

    const deletedChildren = ctx.deleteChildren(originalPaneId); // This deletes *children*, not the pane itself

    const childrenAfterDelete = ctx.getChildNodeIDs(originalPaneId);
    if (VERBOSE) {
      console.log(
        `%cDEBUG: Deleted ${deletedChildren.length} old child nodes.`,
        'color: #A0A;'
      );
      console.log(
        `%cDEBUG: Original pane children IDs AFTER delete: [${childrenAfterDelete.join(', ')}]`,
        'color: #A0A;'
      );
      console.log(
        `%cDEBUG: STEP 2 - REFILLING pane with new nodes...`,
        'color: #0A0; font-weight: bold;'
      );
    }

    const newNodesToAdd: BaseNode[] = [];
    const newMarkdown = template.markdown as TemplateMarkdown | undefined;
    const newBgPane = template.bgPane;

    if (newMarkdown) {
      // Re-parent the new Markdown node to the original pane
      newMarkdown.parentId = originalPaneId;
      newNodesToAdd.push(newMarkdown);

      // The markdown.nodes are already parented to the newMarkdown.id, which is correct.
      // We just need to add them to the context.
      if (newMarkdown.nodes) {
        newNodesToAdd.push(...newMarkdown.nodes);
      }
      if (VERBOSE) {
        console.log(`%cDEBUG: Prepared new Markdown node:`, newMarkdown);
        console.log(
          `%cDEBUG: Prepared ${newMarkdown.nodes?.length || 0} new markdown sub-nodes:`,
          newMarkdown.nodes
        );
      }
    }

    if (newBgPane) {
      // Re-parent the new BgPane node to the original pane
      newBgPane.parentId = originalPaneId;
      newNodesToAdd.push(newBgPane);
      if (VERBOSE) console.log(`%cDEBUG: Prepared new BgPane:`, newBgPane);
    }

    ctx.addNodes(newNodesToAdd); // This adds all nodes AND links them in parentNodes map

    const childrenAfterAdd = ctx.getChildNodeIDs(originalPaneId);
    const childrenNodesAfterAdd = childrenAfterAdd.map((id) =>
      ctx.allNodes.get().get(id)
    );
    if (VERBOSE) {
      console.log(
        `%cDEBUG: Original pane children IDs AFTER add: [${childrenAfterAdd.join(', ')}]`,
        'color: #0A0;'
      );
      console.log(
        `%cDEBUG: Original pane children nodes AFTER add:`,
        childrenNodesAfterAdd
      );
      console.log(
        `%cDEBUG: STEP 3 - UPDATING original pane properties...`,
        'color: #00F; font-weight: bold;'
      );
    }

    // We must get a fresh reference from the store to modify
    const paneToUpdate = ctx.allNodes.get().get(originalPaneId) as PaneNode;

    if (!paneToUpdate) {
      console.error(
        `%cDEBUG: FAILED TO FIND PANE ${originalPaneId} IN STORE FOR FINAL UPDATE.`,
        'color: red; font-weight: bold;'
      );
      return;
    }

    // Copy all style/config properties from the template, but keep the original ID, parentId, slug, title
    paneToUpdate.bgColour = template.bgColour;
    paneToUpdate.isDecorative = template.isDecorative;
    paneToUpdate.heightOffsetDesktop = template.heightOffsetDesktop;
    paneToUpdate.heightOffsetMobile = template.heightOffsetMobile;
    paneToUpdate.heightOffsetTablet = template.heightOffsetTablet;
    paneToUpdate.heightRatioDesktop = template.heightRatioDesktop;
    paneToUpdate.heightRatioMobile = template.heightRatioMobile;
    paneToUpdate.heightRatioTablet = template.heightRatioTablet;
    paneToUpdate.isChanged = true; // Mark as dirty

    if (VERBOSE)
      console.log(
        `%cDEBUG: Calling modifyNodes with this pane object:`,
        paneToUpdate
      );
    ctx.modifyNodes([paneToUpdate]); // This will save the changes and notify the UI

    if (VERBOSE) {
      console.log(
        '%cDEBUG: handleSelectTemplate FINISHED.',
        'color: #00A; font-weight: bold;'
      );
      console.log(
        '%cDEBUG: Notifying ROOT_NODE to force re-render.',
        'color: green; font-weight: bold;'
      );
    }
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
    <Dialog.Root open={isRestyleModalOpen} onOpenChange={handleClose} modal>
      <Portal>
        <Dialog.Backdrop className="z-103 fixed inset-0 bg-black/70" />
        <Dialog.Positioner className="z-104 fixed inset-0 flex items-center justify-center">
          <Dialog.Content
            className="flex flex-col rounded-lg bg-white shadow-2xl"
            style={{ height: '90vw', width: '90vw' }}
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
                      config={config}
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
      </Portal>
    </Dialog.Root>
  );
};
