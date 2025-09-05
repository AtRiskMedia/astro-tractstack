import { useState, useEffect } from 'react';
import { Select } from '@ark-ui/react/select';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { NodesContext } from '@/stores/nodes';
import { createEmptyStorykeep } from '@/utils/compositor/nodesHelper';
import { brandColourStore, preferredThemeStore } from '@/stores/storykeep';
import { getTemplateVisualBreakPane } from '@/utils/compositor/TemplatePanes';
import {
  getJustCopyDesign,
  getIntroDesign,
  getWithArtpackImageDesign,
} from '@/utils/compositor/templateMarkdownStyles';
import {
  parsePageMarkdown,
  validatePageMarkdown,
} from '@/utils/compositor/processMarkdown';
import { themes, type Theme } from '@/types/tractstack';
import type { PageDesign, TemplatePane } from '@/types/compositorTypes';
import {
  PanesPreviewGenerator,
  type PanePreviewRequest,
  type PaneFragmentResult,
} from '@/components/compositor/preview/PanesPreviewGenerator';
import {
  PaneSnapshotGenerator,
  type SnapshotData,
} from '@/components/compositor/preview/PaneSnapshotGenerator';

function getPageDesigns(brand: string, theme: Theme): PageDesign[] {
  return [
    {
      id: 'bg-default-pretty',
      title: 'Pretty with Hero Background',
      introDesign: () =>
        getWithArtpackImageDesign(
          getIntroDesign,
          theme,
          brand,
          false,
          'kCz',
          'wavedrips',
          'cover',
          true,
          'default'
        ),
      contentDesign: (useOdd: boolean) =>
        getJustCopyDesign(theme, brand, useOdd, false, `default`),
      visualBreaks: {
        odd: () => getTemplateVisualBreakPane('cutwide2'),
        even: () => getTemplateVisualBreakPane('cutwide1'),
      },
    },
    {
      id: 'min-default',
      title: 'Default, Minimal',
      introDesign: () => getIntroDesign(theme, brand, false, true, `default`),
      contentDesign: (useOdd: boolean) =>
        getJustCopyDesign(theme, brand, useOdd, false, `default`),
    },
    {
      id: 'min-default-pretty',
      title: 'Default, Pretty',
      introDesign: () => getIntroDesign(theme, brand, false, true, `default`),
      contentDesign: (useOdd: boolean) =>
        getJustCopyDesign(theme, brand, useOdd, false, `default`),
      visualBreaks: {
        odd: () => getTemplateVisualBreakPane('cutwide2'),
        even: () => getTemplateVisualBreakPane('cutwide1'),
      },
    },
    {
      id: 'bg-onecol-pretty',
      title: 'One-Column, Pretty with Hero Background',
      introDesign: () =>
        getWithArtpackImageDesign(
          getIntroDesign,
          theme,
          brand,
          false,
          'kCz',
          'wavedrips',
          'cover',
          true,
          'onecol'
        ),
      contentDesign: (useOdd: boolean) =>
        getJustCopyDesign(theme, brand, useOdd, false, `onecol`),
      visualBreaks: {
        odd: () => getTemplateVisualBreakPane('cutwide2'),
        even: () => getTemplateVisualBreakPane('cutwide1'),
      },
    },
    {
      id: 'min-onecol',
      title: 'One-Column, Minimal',
      introDesign: () => getIntroDesign(theme, brand, false, true, `onecol`),
      contentDesign: (useOdd: boolean) =>
        getJustCopyDesign(theme, brand, useOdd, false, `onecol`),
    },
    {
      id: 'min-onecol-pretty',
      title: 'One-Column, Pretty',
      introDesign: () => getIntroDesign(theme, brand, false, true, `onecol`),
      contentDesign: (useOdd: boolean) =>
        getJustCopyDesign(theme, brand, useOdd, false, `onecol`),
      visualBreaks: {
        odd: () => getTemplateVisualBreakPane('cutwide2'),
        even: () => getTemplateVisualBreakPane('cutwide1'),
      },
    },
    {
      id: 'bg-center-pretty',
      title: 'Centered, Pretty with Hero Background',
      introDesign: () =>
        getWithArtpackImageDesign(
          getIntroDesign,
          theme,
          brand,
          false,
          'kCz',
          'wavedrips',
          'cover',
          true,
          'center'
        ),
      contentDesign: (useOdd: boolean) =>
        getJustCopyDesign(theme, brand, useOdd, false, `center`),
      visualBreaks: {
        odd: () => getTemplateVisualBreakPane('cutwide2'),
        even: () => getTemplateVisualBreakPane('cutwide1'),
      },
    },
    {
      id: 'min-centered',
      title: 'Centered, Minimal',
      introDesign: () => getIntroDesign(theme, brand, false, true, `center`),
      contentDesign: (useOdd: boolean) =>
        getJustCopyDesign(theme, brand, useOdd, false, `center`),
    },
    {
      id: 'min-centered-pretty',
      title: 'Centered, Pretty',
      introDesign: () => getIntroDesign(theme, brand, false, true, `center`),
      contentDesign: (useOdd: boolean) =>
        getJustCopyDesign(theme, brand, useOdd, false, `center`),
      visualBreaks: {
        odd: () => getTemplateVisualBreakPane('cutwide2'),
        even: () => getTemplateVisualBreakPane('cutwide1'),
      },
    },
  ];
}

interface PageCreationPreviewProps {
  markdownContent: string;
  onComplete: (markdownContent: string, design: PageDesign) => void;
  onBack: () => void;
  isApplying?: boolean;
}

export const PageCreationPreview = ({
  markdownContent,
  onComplete,
  onBack,
  isApplying,
}: PageCreationPreviewProps) => {
  const [selectedTheme, setSelectedTheme] = useState<Theme>(
    preferredThemeStore.get()
  );
  const [selectedDesignIndex, setSelectedDesignIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [paneRequests, setPaneRequests] = useState<PanePreviewRequest[]>([]);
  const [paneFragments, setPaneFragments] = useState<PaneFragmentResult[]>([]);
  const [snapshots, setSnapshots] = useState<Map<string, SnapshotData>>(
    new Map()
  );

  const brand = brandColourStore.get();
  const pageDesigns = getPageDesigns(brand, selectedTheme);

  const themesCollection = createListCollection({
    items: themes,
    itemToValue: (item) => item,
    itemToString: (item) => item.replace(/-/g, ' '),
  });

  const designsCollection = createListCollection({
    items: pageDesigns.map((design, index) => ({ design, index })),
    itemToValue: (item) => item.index.toString(),
    itemToString: (item) => item.design.title,
  });

  useEffect(() => {
    if (!markdownContent) return;

    setPaneRequests([]);
    setPaneFragments([]);
    setSnapshots(new Map());

    const createIsolatedPaneRequests = () => {
      try {
        if (!validatePageMarkdown(markdownContent)) {
          setError('Invalid page structure');
          return;
        }

        const processedPage = parsePageMarkdown(markdownContent);
        const design = pageDesigns[selectedDesignIndex];
        const requests: PanePreviewRequest[] = [];
        const paneTemplates: TemplatePane[] = [];
        let isOdd = true;

        const introSection = processedPage.sections.find(
          (s) => s.type === 'intro'
        );
        if (introSection) {
          const ctx = new NodesContext();
          ctx.addNode(createEmptyStorykeep('tmp'));
          const introTemplate = design.introDesign();
          introTemplate.markdown.markdownBody = introSection.content;
          paneTemplates.push(introTemplate);
          const paneId =
            ctx.addTemplatePane('tmp', introTemplate) ||
            `req-${requests.length}`;
          requests.push({ id: paneId, ctx });
        }

        const contentSections = processedPage.sections.filter(
          (s) => s.type === 'content'
        );
        contentSections.forEach((section, index) => {
          if (design.visualBreaks && index > 0) {
            const aboveTemplate = paneTemplates[paneTemplates.length - 1];
            const aboveColor = aboveTemplate?.bgColour || 'white';

            const nextContentTemplate = design.contentDesign(isOdd);
            const belowColor = nextContentTemplate.bgColour;

            const breakTemplate = isOdd
              ? design.visualBreaks.odd()
              : design.visualBreaks.even();

            breakTemplate.bgColour = aboveColor;
            const svgFill = belowColor;
            if (breakTemplate.bgPane) {
              if (breakTemplate.bgPane.breakDesktop) {
                breakTemplate.bgPane.breakDesktop.svgFill = svgFill;
              }
              if (breakTemplate.bgPane.breakTablet) {
                breakTemplate.bgPane.breakTablet.svgFill = svgFill;
              }
              if (breakTemplate.bgPane.breakMobile) {
                breakTemplate.bgPane.breakMobile.svgFill = svgFill;
              }
            }

            paneTemplates.push(breakTemplate);

            const breakCtx = new NodesContext();
            breakCtx.addNode(createEmptyStorykeep('tmp'));
            const breakPaneId =
              breakCtx.addTemplatePane('tmp', breakTemplate) ||
              `req-${requests.length}`;
            requests.push({ id: breakPaneId, ctx: breakCtx });
          }

          const contentCtx = new NodesContext();
          contentCtx.addNode(createEmptyStorykeep('tmp'));
          const contentTemplate = design.contentDesign(isOdd);
          contentTemplate.markdown.markdownBody = section.content;
          paneTemplates.push(contentTemplate);
          const contentPaneId =
            contentCtx.addTemplatePane('tmp', contentTemplate) ||
            `req-${requests.length}`;
          requests.push({ id: contentPaneId, ctx: contentCtx });

          isOdd = !isOdd;
        });

        setPaneRequests(requests);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to generate preview'
        );
      }
    };

    createIsolatedPaneRequests();
  }, [markdownContent, selectedTheme, selectedDesignIndex]);

  const handleThemeChange = (details: { value: string[] }) => {
    const newTheme = details.value[0] as Theme;
    if (newTheme) setSelectedTheme(newTheme);
  };

  const handleDesignChange = (details: { value: string[] }) => {
    const newDesignIndex = parseInt(details.value[0], 10);
    if (!isNaN(newDesignIndex)) setSelectedDesignIndex(newDesignIndex);
  };

  const handleSnapshotComplete = (id: string, data: SnapshotData) => {
    setSnapshots((prev) => new Map(prev).set(id, data));
  };

  const customStyles = `
    .theme-item[data-highlighted] { background-color: #0891b2; color: white; }
    .theme-item[data-highlighted] .theme-indicator { color: white; }
    .theme-item[data-state="checked"] .theme-indicator { display: flex; }
    .theme-item .theme-indicator { display: none; }
    .theme-item[data-state="checked"] { font-weight: bold; }
    .design-item[data-highlighted] { background-color: #0891b2; color: white; }
    .design-item[data-highlighted] .design-indicator { color: white; }
    .design-item[data-state="checked"] .design-indicator { display: flex; }
    .design-item .indicator { display: none; }
    .design-item[data-state="checked"] { font-weight: bold; }
  `;

  return (
    <div className="rounded-md bg-white p-6">
      <style>{customStyles}</style>
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-6">
          <div className="w-48">
            <Select.Root
              collection={themesCollection}
              defaultValue={[selectedTheme]}
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
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
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
                        <Select.ItemIndicator className="theme-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                          <CheckIcon className="h-5 w-5" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </div>
          <div className="w-64">
            <Select.Root
              collection={designsCollection}
              defaultValue={[selectedDesignIndex.toString()]}
              onValueChange={handleDesignChange}
            >
              <Select.Label className="block text-sm font-bold text-gray-700">
                Layout
              </Select.Label>
              <Select.Control className="relative mt-1">
                <Select.Trigger className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-cyan-600 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-600">
                  <Select.ValueText className="block truncate">
                    {pageDesigns[selectedDesignIndex].title}
                  </Select.ValueText>
                  <Select.Indicator className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                  </Select.Indicator>
                </Select.Trigger>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content className="z-50 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                    {designsCollection.items.map((item) => (
                      <Select.Item
                        key={item.index}
                        item={item}
                        className="design-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                      >
                        <Select.ItemText className="block truncate">
                          {item.design.title}
                        </Select.ItemText>
                        <Select.ItemIndicator className="design-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                          <CheckIcon className="h-5 w-5" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {error ? (
              <span className="text-red-500">{error}</span>
            ) : (
              'Please select a theme and design template'
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              disabled={isApplying}
            >
              Back
            </button>
            <button
              // --- FIX APPLIED HERE ---
              // The onClick handler now sends the correct parameters.
              onClick={() => {
                if (onComplete) {
                  onComplete(markdownContent, pageDesigns[selectedDesignIndex]);
                }
              }}
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700"
              disabled={!!error || isApplying || paneRequests.length === 0}
            >
              {isApplying ? 'Applying...' : 'Apply Design'}
            </button>
          </div>
        </div>
      </div>

      {paneRequests.length > 0 && (
        <PanesPreviewGenerator
          requests={paneRequests}
          onComplete={setPaneFragments}
          onError={(e) => setError(e)}
        />
      )}

      <div className="overflow-hidden rounded-lg bg-white p-4 shadow-lg">
        {paneRequests.length > 0 && paneFragments.length === 0 && !error && (
          <div className="flex h-48 flex-col items-center justify-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-600"></div>
            <p className="text-sm text-gray-500">Generating fragments...</p>
          </div>
        )}

        {paneFragments.map((fragment) => {
          const snapshot = snapshots.get(fragment.id);
          return (
            <div key={fragment.id}>
              {snapshot ? (
                <img
                  src={snapshot.imageData}
                  alt={`Preview for pane ${fragment.id}`}
                  className="block w-full"
                />
              ) : (
                fragment.htmlString && (
                  <div style={{ minHeight: '200px' }}>
                    <PaneSnapshotGenerator
                      id={fragment.id}
                      htmlString={fragment.htmlString}
                      onComplete={handleSnapshotComplete}
                      outputWidth={800}
                    />
                  </div>
                )
              )}
              {fragment.error && (
                <div className="p-4 text-red-500">
                  Error generating preview for pane {fragment.id}:{' '}
                  {fragment.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PageCreationPreview;
