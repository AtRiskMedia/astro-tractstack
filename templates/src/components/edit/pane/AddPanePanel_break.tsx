/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from 'react';
import { Combobox } from '@ark-ui/react';
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
import { tailwindToHex } from '@/utils/compositor/tailwindColors';
import { getTemplateVisualBreakPane } from '@/utils/compositor/TemplatePanes';
import { SvgBreaks } from '@/constants/shapes';
import {
  PaneAddMode,
  type PaneNode,
  type StoryFragmentNode,
  type TemplatePane,
} from '@/types/compositorTypes';

interface AddPaneBreakPanelProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode) => void;
  ctx?: NodesContext;
  isStoryFragment?: boolean;
}

interface PreviewPane {
  ctx: NodesContext;
  snapshot?: SnapshotData;
  template: any;
  index: number;
  variant: string;
  htmlFragment?: string;
  fragmentError?: string;
}

const ITEMS_PER_PAGE = 8;
const VARIANTS = [
  'crooked',
  'crookedwide',
  'stepped',
  'steppedwide',
  'cut1',
  'cutwide1',
  'cut2',
  'cutwide2',
  'lowcut1',
  'lowcutwide1',
  'lowcut2',
  'lowcutwide2',
  'jag',
  'jagwide',
  'burst1',
  'burstwide1',
  'burst2',
  'burstwide2',
] as const;

const templateCategory = {
  id: 'basic',
  title: 'Basic Templates',
  getTemplatesByVariant: (variant: string) => [
    getTemplateVisualBreakPane(variant),
  ],
};

const AddPaneBreakPanel = ({
  nodeId,
  first,
  setMode,
  ctx,
  isStoryFragment = false,
}: AddPaneBreakPanelProps) => {
  const [previews, setPreviews] = useState<PreviewPane[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [variantQuery, setVariantQuery] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<string>('all');
  const [fragmentsToGenerate, setFragmentsToGenerate] = useState<
    PanePreviewRequest[]
  >([]);

  const collection = useMemo(() => {
    const allVariants = ['all', ...VARIANTS];
    const filteredVariants =
      variantQuery === ''
        ? allVariants
        : allVariants.filter((variant) =>
            variant.toLowerCase().includes(variantQuery.toLowerCase())
          );

    return createListCollection({
      items: filteredVariants,
      itemToValue: (item) => item,
      itemToString: (item) => (item === 'all' ? 'All Variants' : item),
    });
  }, [variantQuery]);

  const filteredVariants = useMemo(() => {
    return selectedVariant === 'all'
      ? VARIANTS
      : [selectedVariant as (typeof VARIANTS)[number]];
  }, [selectedVariant]);

  useEffect(() => {
    const newPreviews = filteredVariants.map((variant, index: number) => {
      const ctx = new NodesContext();
      ctx.isTemplate.set(true);
      ctx.addNode(createEmptyStorykeep('tmp'));
      const template = templateCategory.getTemplatesByVariant(variant)[0];
      ctx.addTemplatePane('tmp', template);
      return { ctx, template, index, variant };
    });
    setPreviews(newPreviews);
    setCurrentPage(0);
    setRenderedPages(new Set());
  }, [filteredVariants]);

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

  const handleVisualBreakInsert = (
    variant: string,
    nodeId: string,
    first: boolean
  ) => {
    if (!ctx) return;

    const template = getTemplateVisualBreakPane(variant) as TemplatePane;

    const ownerId = isStoryFragment
      ? nodeId
      : ctx.getClosestNodeTypeFromId(nodeId, 'StoryFragment');
    const owner = ctx.allNodes.get().get(ownerId);

    let aboveColor = 'white';
    let belowColor = 'white';

    if (isStoryFragment) {
      const sf = owner as StoryFragmentNode;
      if (sf.paneIds.length > 0) {
        if (first) {
          const firstPane = ctx.allNodes.get().get(sf.paneIds[0]) as PaneNode;
          belowColor = firstPane?.bgColour || 'white';
        } else {
          const lastPane = ctx.allNodes
            .get()
            .get(sf.paneIds[sf.paneIds.length - 1]) as PaneNode;
          aboveColor = lastPane?.bgColour || 'white';
        }
      }
    } else {
      const sf = ctx.allNodes.get().get(ownerId) as StoryFragmentNode;
      const currentIndex = sf.paneIds.indexOf(nodeId);
      if (first) {
        const abovePaneId =
          currentIndex > 0 ? sf.paneIds[currentIndex - 1] : null;
        const abovePane = abovePaneId
          ? (ctx.allNodes.get().get(abovePaneId) as PaneNode)
          : null;
        const currentPane = ctx.allNodes.get().get(nodeId) as PaneNode;
        aboveColor = abovePane?.bgColour || 'white';
        belowColor = currentPane?.bgColour || 'white';
      } else {
        const belowPaneId =
          currentIndex < sf.paneIds.length - 1
            ? sf.paneIds[currentIndex + 1]
            : null;
        const currentPane = ctx.allNodes.get().get(nodeId) as PaneNode;
        const belowPane = belowPaneId
          ? (ctx.allNodes.get().get(belowPaneId) as PaneNode)
          : null;
        aboveColor = currentPane?.bgColour || 'white';
        belowColor = belowPane?.bgColour || 'white';
      }
    }

    const shapeName = `kCz${variant}`;
    const isFlipped = SvgBreaks[shapeName]?.flipped || false;
    template.bgColour = tailwindToHex(
      isFlipped ? aboveColor : belowColor,
      null
    );
    const svgFill = tailwindToHex(
      isFlipped ? belowColor : aboveColor === belowColor ? 'black' : aboveColor,
      null
    );

    if (template.bgPane) {
      if (template.bgPane.type === 'visual-break') {
        if (template.bgPane.breakDesktop) {
          template.bgPane.breakDesktop.svgFill = svgFill;
        }
        if (template.bgPane.breakTablet) {
          template.bgPane.breakTablet.svgFill = svgFill;
        }
        if (template.bgPane.breakMobile) {
          template.bgPane.breakMobile.svgFill = svgFill;
        }
      }
    }

    ctx.addTemplatePane(ownerId, template, nodeId, first ? 'before' : 'after');
    ctx.notifyNode(`root`);
    setMode(PaneAddMode.DEFAULT);
  };

  const comboboxItemStyles = `
    .variant-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .variant-item[data-highlighted] .variant-indicator {
      color: white;
    }
    .variant-item[data-state="checked"] .variant-indicator {
      display: flex;
    }
    .variant-item .variant-indicator {
      display: none;
    }
    .variant-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="p-0.5 shadow-inner">
      <style>{comboboxItemStyles}</style>
      <div className="group flex w-full gap-1 rounded-md bg-white p-1.5">
        <button
          onClick={() => setMode(PaneAddMode.DEFAULT)}
          className="w-fit rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200 focus:bg-gray-200"
        >
          ← Go Back
        </button>

        <div className="ml-4 flex flex-wrap items-center gap-x-6 gap-y-2 py-2">
          <div className="flex-none rounded px-2 py-2.5 font-action text-sm font-bold text-cyan-700 shadow-sm">
            + Visual Break
          </div>

          <div className="w-48">
            <Combobox.Root
              collection={collection}
              value={[selectedVariant]}
              onValueChange={(details) => {
                const newVariant = details.value[0] || 'all';
                setSelectedVariant(newVariant);
              }}
              onInputValueChange={(details) =>
                setVariantQuery(details.inputValue)
              }
              loopFocus={true}
              openOnKeyPress={true}
              composite={true}
            >
              <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 md:text-sm">
                  <Combobox.Input
                    autoComplete="off"
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                    placeholder="Select variant..."
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </Combobox.Trigger>
                </div>

                <Combobox.Content className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none md:text-sm">
                  {collection.items.length === 0 ? (
                    <div className="relative cursor-default select-none px-4 py-2 text-gray-700">
                      Nothing found.
                    </div>
                  ) : (
                    collection.items.map((variant) => (
                      <Combobox.Item
                        key={variant}
                        item={variant}
                        className="variant-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                      >
                        <span className="block truncate">
                          {variant === 'all' ? 'All Variants' : variant}
                        </span>
                        <span className="variant-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </Combobox.Item>
                    ))
                  )}
                </Combobox.Content>
              </div>
            </Combobox.Root>
          </div>
        </div>
      </div>

      <h3 className="px-3.5 pb-1.5 pt-4 font-action text-xl font-bold text-black">
        Click on a break design to use:
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

      <div className="grid grid-cols-2 gap-6 p-2 xl:grid-cols-3">
        {visiblePreviews.map((preview) => (
          <div
            key={preview.index}
            onClick={() =>
              handleVisualBreakInsert(preview.variant, nodeId, first)
            }
            className={`group relative w-full cursor-pointer rounded-sm bg-mywhite shadow-inner transition-all duration-200 ${
              preview.snapshot
                ? 'hover:outline-solid hover:outline hover:outline-4'
                : ''
            }`}
            style={{
              ...(!preview.snapshot ? { minHeight: '75px' } : {}),
            }}
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
                  outputWidth={400}
                />
              )}

            {!preview.htmlFragment && !preview.fragmentError && (
              <div className="flex h-24 items-center justify-center">
                <div className="text-gray-500">Loading preview...</div>
              </div>
            )}

            {preview.fragmentError && (
              <div className="flex h-24 items-center justify-center">
                <div className="text-red-500">Preview error</div>
              </div>
            )}

            {preview.snapshot && (
              <>
                <div className="mb-4 p-3.5">
                  <img
                    src={preview.snapshot.imageData}
                    alt={`${preview.variant} break ${preview.index + 1}`}
                    className="w-full"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 rounded-t-md bg-mydarkgrey px-2 py-1 text-sm text-white group-hover:bg-myblack">
                  {preview.variant}
                </div>
              </>
            )}
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

export default AddPaneBreakPanel;
