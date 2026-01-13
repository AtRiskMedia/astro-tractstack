import { useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import {
  Select,
  Combobox,
  Pagination,
  Portal,
  type SelectValueChangeDetails,
  type ComboboxInputValueChangeDetails,
  type PaginationPageChangeDetails,
} from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import { NodesContext } from '@/stores/nodes';
import { viewportKeyStore } from '@/stores/storykeep';
import { createEmptyStorykeep } from '@/utils/compositor/nodesHelper';
import { convertStorageToLiveTemplate } from '@/utils/compositor/designLibraryHelper';
import type { StoragePane } from '@/types/compositorTypes';
import type { DesignLibraryEntry } from '@/types/tractstack';
import {
  PaneSnapshotGenerator,
  type SnapshotData,
} from '@/components/compositor/preview/PaneSnapshotGenerator';
import { brandConfigStore } from '@/stores/storykeep';
import {
  PanesPreviewGenerator,
  type PanePreviewRequest,
  type PaneFragmentResult,
} from '@/components/compositor/preview/PanesPreviewGenerator';
import { classNames } from '@/utils/helpers';

const PAGE_SIZE = 12;

interface TemplatePreviewItemProps {
  storageTemplate: StoragePane;
  onClick: () => void;
  title: string;
  category: string;
}

const TemplatePreviewItem = ({
  storageTemplate,
  onClick,
  title,
  category,
}: TemplatePreviewItemProps) => {
  const [previewState, setPreviewState] = useState<{
    htmlFragment?: string;
    snapshot?: SnapshotData;
    error?: string;
  } | null>(null);

  // Convert storage template to live template for previewing
  const liveTemplate = useMemo(
    () => convertStorageToLiveTemplate(storageTemplate),
    [storageTemplate]
  );

  const fragmentRequest = useMemo((): PanePreviewRequest[] => {
    // This preview logic creates a *temporary* context.
    const ctx = new NodesContext();
    ctx.isTemplate.set(true);
    ctx.addNode(createEmptyStorykeep('tmp'));
    ctx.addTemplatePane('tmp', liveTemplate);
    return [{ id: liveTemplate.id, ctx }];
  }, [liveTemplate]);

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
      className="group flex cursor-pointer flex-col rounded-lg border bg-white shadow-sm transition-all hover:border-cyan-600 hover:shadow-lg"
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="relative overflow-hidden rounded-t-lg border-b bg-gray-50">
        {!previewState?.snapshot && (
          <div className="flex h-48 w-full animate-pulse items-center justify-center bg-gray-200 text-sm text-gray-500">
            Generating preview...
          </div>
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
            id={liveTemplate.id}
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
            alt={`Preview for ${title}`}
            className="block h-auto w-full object-contain"
          />
        )}
        <div className="absolute inset-0 bg-cyan-600/80 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-full items-center justify-center">
            <span className="font-action text-xl font-bold text-white">
              Select Design
            </span>
          </div>
        </div>
      </div>
      <div className="flex-grow p-3">
        <h3 className="truncate font-bold" title={title}>
          {title}
        </h3>
        <p className="text-sm capitalize text-gray-600">{category}</p>
      </div>
    </div>
  );
};

// --- Main component ---
interface DesignLibraryStepProps {
  onSelect: (entry: DesignLibraryEntry) => void;
}

export const DesignLibraryStep = ({ onSelect }: DesignLibraryStepProps) => {
  const designLibrary = brandConfigStore.get()?.DESIGN_LIBRARY || [];
  const viewport = useStore(viewportKeyStore).value;

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const gridClass = useMemo(() => {
    switch (viewport) {
      case 'mobile':
        return 'grid-cols-1';
      case 'tablet':
        return 'grid-cols-2';
      case 'desktop':
        return 'grid-cols-3';
    }
  }, [viewport]);

  const categories = useMemo(() => {
    const allCategories = new Set(
      designLibrary.map((entry: DesignLibraryEntry) => entry.category)
    );
    return ['all', ...Array.from(allCategories)];
  }, [designLibrary]);

  const filteredEntries = useMemo(() => {
    return designLibrary
      .filter(
        (entry: DesignLibraryEntry) =>
          (selectedCategory === 'all' || entry.category === selectedCategory) &&
          entry.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [designLibrary, selectedCategory, searchTerm]);

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredEntries.slice(start, end);
  }, [filteredEntries, currentPage]);

  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);

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
        items: categories.map((c) => ({
          label: c.charAt(0).toUpperCase() + c.slice(1),
          value: c,
        })),
        itemToValue: (item) => item.value,
        itemToString: (item) => item.label,
      }),
    [categories]
  );

  return (
    <div className="flex h-full flex-col space-y-4 rounded-lg bg-gray-50 p-4 shadow-inner">
      <label className="block text-lg font-bold text-gray-800">
        2. Choose a Design
      </label>

      <nav className="flex items-center gap-x-4 rounded-md border bg-white p-3">
        <Select.Root
          collection={selectCollection}
          value={[selectedCategory]}
          onValueChange={(details: SelectValueChangeDetails) =>
            setSelectedCategory(details.value[0])
          }
          className="w-48"
          positioning={{ gutter: 4 }}
        >
          <Select.Label className="mb-1 text-sm font-bold text-gray-700">
            Category
          </Select.Label>
          <Select.Control>
            <Select.Trigger className="flex w-full items-center justify-between rounded-md border bg-white p-2 text-left shadow-sm">
              <Select.ValueText />
              <Select.Indicator>▼</Select.Indicator>
            </Select.Trigger>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content className="z-50 rounded-md border bg-white shadow-lg">
                {categories.map((c) => (
                  <Select.Item
                    key={c}
                    item={{
                      label: c.charAt(0).toUpperCase() + c.slice(1),
                      value: c,
                    }}
                    className="cursor-pointer p-2 hover:bg-gray-100"
                  >
                    <Select.ItemText>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Select.ItemText>
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
          <Combobox.Label className="mb-1 text-sm font-bold text-gray-700">
            Filter by Title
          </Combobox.Label>
          <Combobox.Control>
            <Combobox.Input
              placeholder="Search by title..."
              className="w-full rounded-md border p-2 shadow-sm"
            />
          </Combobox.Control>
          <Portal>
            <Combobox.Positioner>
              <Combobox.Content className="z-50 rounded-md border bg-white shadow-lg">
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

      {/* --- Previews Grid --- */}
      <main className="flex-1 overflow-y-auto">
        {paginatedEntries.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md bg-white p-6">
            <p className="text-gray-500">
              No designs found matching your criteria.
            </p>
          </div>
        ) : (
          <div className={classNames('grid gap-6', gridClass)}>
            {paginatedEntries.map((entry) => (
              <TemplatePreviewItem
                key={entry.title}
                storageTemplate={entry.template}
                onClick={() => onSelect(entry)}
                title={entry.title}
                category={entry.category}
              />
            ))}
          </div>
        )}
      </main>

      {/* --- Pagination --- */}
      {totalPages > 1 && (
        <footer className="flex items-center justify-center border-t pt-4">
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
                        'flex h-9 w-9 items-center justify-center rounded-md text-sm',
                        page.value === currentPage
                          ? 'bg-cyan-600 font-bold text-white'
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
    </div>
  );
};
