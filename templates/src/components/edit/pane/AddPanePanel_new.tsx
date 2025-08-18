/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from 'react';
import { Switch } from '@ark-ui/react';
import { Select } from '@ark-ui/react/select';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronUpDownIcon from '@heroicons/react/20/solid/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/20/solid/CheckIcon';
import { NodesContext } from '@/stores/nodes';
import {
  PanesPreviewGenerator,
  type PanePreviewRequest,
  type PaneFragmentResult,
} from '@/components/compositor/preview/PanesPreviewGenerator';
import {
  PaneSnapshotGenerator,
  type SnapshotData,
} from '@/components/compositor/preview/PaneSnapshotGenerator';
import { createEmptyStorykeep } from '@/utils/compositor/nodesHelper';
import { cloneDeep } from '@/utils/helpers';
import {
  brandColourStore,
  preferredThemeStore,
  hasAssemblyAIStore,
} from '@/stores/storykeep';
import { templateCategories } from '@/utils/compositor/templateMarkdownStyles';
import { AddPanePanel_newAICopy } from './AddPanePanel_newAICopy';
import { AddPaneNewCopyMode, type CopyMode } from './AddPanePanel_newCopyMode';
import { AddPaneNewCustomCopy } from './AddPanePanel_newCustomCopy';
import { getTitleSlug } from '@/utils/aai/getTitleSlug';
import { fullContentMapStore } from '@/stores/storykeep';
import { themes, type Theme } from '@/types/tractstack';
import { PaneAddMode } from '@/types/compositorTypes';

interface AddPaneNewPanelProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode, reset: boolean) => void;
  ctx?: NodesContext;
  isStoryFragment?: boolean;
  isContextPane?: boolean;
}

interface PreviewPane {
  ctx: NodesContext;
  snapshot?: SnapshotData;
  template: any;
  index: number;
  htmlFragment?: string;
  fragmentError?: string;
}

interface TemplateCategory {
  id: string;
  title: string;
  getTemplates: (theme: Theme, brand: string, useOdd: boolean) => any[];
}

const ITEMS_PER_PAGE = 8;

const AddPaneNewPanel = ({
  nodeId,
  first,
  setMode,
  ctx,
  isStoryFragment = false,
  isContextPane = false,
}: AddPaneNewPanelProps) => {
  const brand = brandColourStore.get();
  const hasAssemblyAI = hasAssemblyAIStore.get();
  const [copyMode, setCopyMode] = useState<CopyMode>('design');
  const [customMarkdown, setCustomMarkdown] = useState<string>(`...`);
  const [previews, setPreviews] = useState<PreviewPane[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [selectedTheme, setSelectedTheme] = useState<Theme>(
    preferredThemeStore.get()
  );
  const [useOddVariant, setUseOddVariant] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>(
    templateCategories[isContextPane ? 1 : first ? 4 : 0]
  );
  const [isInserting, setIsInserting] = useState(false);
  const [aiContentGenerated, setAiContentGenerated] = useState(false);
  const [fragmentsToGenerate, setFragmentsToGenerate] = useState<
    PanePreviewRequest[]
  >([]);
  const shouldShowDesigns = copyMode !== 'ai' || aiContentGenerated;

  const categoryCollection = useMemo(() => {
    const categories =
      copyMode === `ai` || isContextPane
        ? [templateCategories[1]]
        : templateCategories;

    return createListCollection({
      items: categories,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.title,
    });
  }, [copyMode, isContextPane]);

  const themesCollection = useMemo(() => {
    return createListCollection({
      items: themes,
      itemToValue: (item) => item,
      itemToString: (item) => item.replace(/-/g, ' '),
    });
  }, []);

  const filteredTemplates = useMemo(() => {
    if (copyMode === `ai` || isContextPane)
      return templateCategories[1].getTemplates(
        selectedTheme,
        brand,
        useOddVariant
      );
    if (isContextPane)
      return templateCategories[1].getTemplates(
        selectedTheme,
        brand,
        useOddVariant
      );
    return selectedCategory.getTemplates(selectedTheme, brand, useOddVariant);
  }, [selectedTheme, useOddVariant, selectedCategory, copyMode, isContextPane]);

  useEffect(() => {
    if (copyMode !== 'ai') setAiContentGenerated(false);
    if (copyMode !== 'ai' || isContextPane)
      setSelectedCategory(templateCategories[first ? 4 : 0]);
  }, [copyMode, first, isContextPane]);

  const handleAiContentGenerated = (content: string) => {
    setCustomMarkdown(content);
    setAiContentGenerated(true);
  };

  useEffect(() => {
    const newPreviews = filteredTemplates.map((template, index: number) => {
      const ctx = new NodesContext();
      ctx.addNode(createEmptyStorykeep('tmp'));
      const thisTemplate =
        copyMode === 'custom' || (copyMode === 'ai' && aiContentGenerated)
          ? {
              ...template,
              markdown: template.markdown && {
                ...template.markdown,
                markdownBody: customMarkdown,
              },
            }
          : template;
      ctx.addTemplatePane('tmp', thisTemplate);
      return { ctx, template: thisTemplate, index };
    });
    setPreviews(newPreviews);
    setCurrentPage(0);
    setRenderedPages(new Set());
  }, [filteredTemplates, customMarkdown, copyMode, aiContentGenerated]);

  const totalPages = Math.ceil(previews.length / ITEMS_PER_PAGE);

  const visiblePreviews = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return previews.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [previews, currentPage]);

  useEffect(() => {
    const pageHasBeenRendered = renderedPages.has(currentPage);
    const previewsOnThisPageNeedFetching = visiblePreviews.some(
      (p) => !p.htmlFragment && !p.fragmentError
    );

    if (previewsOnThisPageNeedFetching && !pageHasBeenRendered) {
      const newRequests = visiblePreviews
        .filter((p) => !p.htmlFragment && !p.fragmentError)
        .map((p) => ({
          id: `template-${p.index}`,
          ctx: p.ctx,
        }));
      setFragmentsToGenerate(newRequests);
    } else {
      setFragmentsToGenerate([]);
    }
  }, [currentPage, visiblePreviews, renderedPages]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFragmentsComplete = (results: PaneFragmentResult[]) => {
    setPreviews((prevPreviews) => {
      const updated = [...prevPreviews];
      results.forEach((result) => {
        const index = parseInt(result.id.replace('template-', ''));
        const previewIndex = updated.findIndex((p) => p.index === index);
        if (previewIndex !== -1) {
          updated[previewIndex] = {
            ...updated[previewIndex],
            htmlFragment: result.htmlString,
            fragmentError: result.error,
          };
        }
      });
      return updated;
    });
    setRenderedPages((prev) => new Set(prev).add(currentPage));
  };

  const handleSnapshotComplete = (id: string, snapshot: SnapshotData) => {
    const index = parseInt(id.replace('template-', ''));
    setPreviews((prevPreviews) => {
      const updated = [...prevPreviews];
      const previewIndex = updated.findIndex((p) => p.index === index);
      if (previewIndex !== -1) {
        updated[previewIndex] = {
          ...updated[previewIndex],
          snapshot,
        };
      }
      return updated;
    });
  };

  const handleTemplateInsert = async (
    template: any,
    nodeId: string,
    first: boolean
  ) => {
    if (isInserting) return;
    setIsInserting(true);

    try {
      if (ctx) {
        const hasMarkdownContent =
          template?.markdown?.markdownBody &&
          template.markdown.markdownBody.trim() !== '...' &&
          template.markdown.markdownBody.trim().length > 0;

        const insertTemplate = [`blank`, `custom`].includes(copyMode)
          ? {
              ...cloneDeep(template),
              markdown: template.markdown && {
                ...template.markdown,
                markdownBody: copyMode === `blank` ? `...` : customMarkdown,
              },
            }
          : cloneDeep(template);

        const markdownContent = [`blank`].includes(copyMode)
          ? null
          : copyMode === `custom`
            ? customMarkdown
            : insertTemplate?.markdown?.markdownBody;

        insertTemplate.title = '';
        insertTemplate.slug = '';

        if (
          copyMode === `ai` &&
          hasAssemblyAI &&
          markdownContent &&
          hasMarkdownContent
        ) {
          const existingSlugs = fullContentMapStore
            .get()
            .filter((item) => ['Pane', 'StoryFragment'].includes(item.type))
            .map((item) => item.slug);

          const titleSlugResult = await getTitleSlug(
            markdownContent,
            existingSlugs
          );

          if (titleSlugResult) {
            insertTemplate.title = titleSlugResult.title;
            insertTemplate.slug = titleSlugResult.slug;
          }
        }

        const ownerId =
          isStoryFragment || isContextPane
            ? nodeId
            : ctx.getClosestNodeTypeFromId(nodeId, 'StoryFragment');

        if (isContextPane) {
          insertTemplate.isContextPane = true;
          ctx.addContextTemplatePane(ownerId, insertTemplate);
        } else {
          const newPaneId = ctx.addTemplatePane(
            ownerId,
            insertTemplate,
            nodeId,
            first ? 'before' : 'after'
          );
          if (newPaneId) ctx.notifyNode(`root`);
        }
        setMode(PaneAddMode.DEFAULT, false);
      }
    } catch (error) {
      console.error('Error inserting template:', error);
    } finally {
      setIsInserting(false);
    }
  };

  const handleThemeChange = (details: { value: string[] }) => {
    const newTheme = details.value[0] as Theme;
    if (newTheme) {
      setSelectedTheme(newTheme);
    }
  };

  const handleCategoryChange = (details: { value: string[] }) => {
    const id = details.value[0];
    if (id) {
      const category = templateCategories.find((cat) => cat.id === id);
      if (category) setSelectedCategory(category);
    }
  };

  const customStyles = `
    .category-item[data-highlighted] { background-color: #0891b2; color: white; }
    .category-item[data-highlighted] .category-indicator { color: white; }
    .category-item[data-state="checked"] .category-indicator { display: flex; }
    .category-item .category-indicator { display: none; }
    .category-item[data-state="checked"] { font-weight: bold; }
    .theme-item[data-highlighted] { background-color: #0891b2; color: white; }
    .theme-item[data-highlighted] .theme-indicator { color: white; }
    .theme-item[data-state="checked"] .theme-indicator { display: flex; }
    .theme-item .theme-indicator { display: none; }
    .theme-item[data-state="checked"] { font-weight: bold; }
  `;

  return (
    <div className="bg-white p-3.5 shadow-inner">
      <style>{customStyles}</style>
      <div className="group flex w-full gap-1 rounded-md bg-white p-1.5">
        <button
          onClick={() => setMode(PaneAddMode.DEFAULT, first)}
          className="w-fit rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200 focus:bg-gray-200"
        >
          ← Go Back
        </button>

        <div className="ml-4 flex flex-wrap items-center gap-x-6 gap-y-2 py-2">
          <div className="font-action flex-none rounded px-2 py-2.5 text-sm font-bold text-cyan-700 shadow-sm">
            + Design New Pane
          </div>

          {!(copyMode === 'ai' && aiContentGenerated) && (
            <AddPaneNewCopyMode selected={copyMode} onChange={setCopyMode} />
          )}
          {copyMode === 'custom' && (
            <div className="mt-4 w-full">
              <AddPaneNewCustomCopy
                value={customMarkdown}
                onChange={setCustomMarkdown}
              />
            </div>
          )}
          {copyMode === 'ai' && !aiContentGenerated && (
            <div className="mt-4 w-full">
              <AddPanePanel_newAICopy
                onChange={handleAiContentGenerated}
                isContextPane={isContextPane}
              />
            </div>
          )}
        </div>
      </div>

      {shouldShowDesigns && (
        <>
          <h3 className="font-action px-3.5 pb-1.5 pt-4 text-xl font-bold text-black">
            1. Template design settings
          </h3>

          <div className="grid grid-cols-1 gap-4 p-2 md:grid-cols-3">
            <div className="w-full">
              <Select.Root
                collection={themesCollection}
                value={[selectedTheme]}
                onValueChange={handleThemeChange}
              >
                <Select.Label className="block text-sm font-bold text-gray-700">
                  Theme
                </Select.Label>
                <Select.Control className="relative mt-1">
                  <Select.Trigger className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-cyan-600 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-600">
                    <Select.ValueText className="block truncate capitalize">
                      {selectedTheme.replace(/-/g, ' ')}
                    </Select.ValueText>
                    <Select.Indicator className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </Select.Indicator>
                  </Select.Trigger>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content className="z-50 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                      {themesCollection.items.map((theme) => (
                        <Select.Item
                          key={theme}
                          item={theme}
                          className="theme-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                        >
                          <Select.ItemText className="block truncate capitalize">
                            {theme.replace(/-/g, ' ')}
                          </Select.ItemText>
                          <Select.ItemIndicator className="theme-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </div>

            {!isContextPane && (
              <div className="w-full">
                <Select.Root
                  collection={categoryCollection}
                  value={[selectedCategory.id]}
                  onValueChange={handleCategoryChange}
                >
                  <Select.Label className="block text-sm font-bold text-gray-700">
                    Category
                  </Select.Label>
                  <Select.Control className="relative mt-1">
                    <Select.Trigger className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                      <Select.ValueText className="block truncate">
                        {selectedCategory.title}
                      </Select.ValueText>
                      <Select.Indicator className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronUpDownIcon
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </Select.Indicator>
                    </Select.Trigger>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content className="z-50 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                        {categoryCollection.items.map((category) => (
                          <Select.Item
                            key={category.id}
                            item={category}
                            className="category-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                          >
                            <Select.ItemText className="block truncate">
                              {category.title}
                            </Select.ItemText>
                            <Select.ItemIndicator className="category-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch.Root
                checked={useOddVariant}
                onCheckedChange={(details) => setUseOddVariant(details.checked)}
                className="inline-flex items-center"
              >
                <Switch.Control
                  className={`${
                    useOddVariant ? 'bg-cyan-600' : 'bg-gray-200'
                  } relative my-2 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2`}
                >
                  <Switch.Thumb
                    className={`${
                      useOddVariant ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200`}
                  />
                </Switch.Control>
                <Switch.HiddenInput />
                <div className="flex h-6 items-center">
                  <Switch.Label className="px-4 text-sm text-gray-700">
                    Use odd variant
                  </Switch.Label>
                </div>
              </Switch.Root>
            </div>
          </div>

          <h3 className="font-action px-3.5 pb-1.5 pt-4 text-xl font-bold text-black">
            2. Choose design
          </h3>

          {fragmentsToGenerate.length > 0 && (
            <PanesPreviewGenerator
              requests={fragmentsToGenerate}
              onComplete={handleFragmentsComplete}
              onError={(error) =>
                console.error('Fragment generation error:', error)
              }
            />
          )}

          <div className="grid grid-cols-2 gap-4 p-2 xl:grid-cols-3">
            {visiblePreviews.map((preview) => (
              <div key={preview.index} className="flex flex-col items-center">
                <div
                  onClick={
                    isInserting
                      ? undefined
                      : () =>
                          handleTemplateInsert(preview.template, nodeId, first)
                  }
                  className={`bg-mywhite group relative w-full rounded-sm shadow-inner ${
                    isInserting
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer'
                  } transition-all duration-200 ${
                    preview.snapshot
                      ? 'hover:outline-solid hover:outline hover:outline-4'
                      : ''
                  }`}
                  style={{
                    ...(!preview.snapshot ? { minHeight: '150px' } : {}),
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={preview.template.title}
                >
                  {preview.htmlFragment &&
                    !preview.snapshot &&
                    !preview.fragmentError && (
                      <PaneSnapshotGenerator
                        id={`template-${preview.index}`}
                        htmlString={preview.htmlFragment}
                        onComplete={handleSnapshotComplete}
                        onError={(id, error) =>
                          console.error(`Snapshot error for ${id}:`, error)
                        }
                        outputWidth={800}
                      />
                    )}

                  {!preview.htmlFragment && !preview.fragmentError && (
                    <div className="flex h-48 items-center justify-center">
                      <div className="text-gray-500">Loading preview...</div>
                    </div>
                  )}

                  {preview.fragmentError && (
                    <div className="flex h-48 items-center justify-center">
                      <div className="text-red-500">Preview error</div>
                    </div>
                  )}

                  {preview.snapshot && (
                    <div className="p-0.5">
                      <img
                        src={preview.snapshot.imageData}
                        alt={`Template: ${preview.template.title}`}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
                <p className="bg-mydarkgrey mt-2 w-full break-words p-2 text-center text-sm text-white">
                  {preview.template.title}
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
        </>
      )}
    </div>
  );
};

export default AddPaneNewPanel;
