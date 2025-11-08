import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { Combobox } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import CheckIcon from '@heroicons/react/20/solid/CheckIcon';
import ChevronUpDownIcon from '@heroicons/react/20/solid/ChevronUpDownIcon';
import { fullContentMapStore, viewportKeyStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import ColorPickerCombo from '@/components/fields/ColorPickerCombo';
import type { PaneNode } from '@/types/compositorTypes';
import type { BrandConfig } from '@/types/tractstack';

interface FeaturedArticleSetupProps {
  params: Record<string, string>;
  nodeId: string;
  config: BrandConfig;
}

const comboboxItemStyles = `
  .combo-item .check-indicator {
    display: none;
  }
  .combo-item[data-state="checked"] .check-indicator {
    display: flex;
  }
`;

const FeaturedArticleSetup = ({
  params,
  nodeId,
  config,
}: FeaturedArticleSetupProps) => {
  const $contentMap = useStore(fullContentMapStore);
  const $viewportKey = useStore(viewportKeyStore);
  const isInitialMount = useRef(true);
  const ctx = getCtx();

  const availableStories = useMemo(
    () =>
      $contentMap.filter(
        (item) =>
          item.type === 'StoryFragment' &&
          item.description &&
          item.panes &&
          item.panes.length > 0 &&
          item.thumbSrc
      ),
    [$contentMap]
  );

  const initialSlug = params?.slug || '';
  const initialStory = availableStories.find(
    (story) => story.slug === initialSlug
  );

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [query, setQuery] = useState(initialStory?.title || '');
  const [bgColor, setBgColor] = useState(params?.bgColor || '');

  const selectedStory = useMemo(
    () => availableStories.find((story) => story.slug === selectedSlug),
    [availableStories, selectedSlug]
  );

  const collection = useMemo(() => {
    const filtered =
      query === '' || query === selectedStory?.title
        ? availableStories
        : availableStories.filter((story) =>
            story.title.toLowerCase().includes(query.toLowerCase())
          );
    return createListCollection({
      items: filtered,
      itemToValue: (item) => item.slug,
      itemToString: (item) => item.title,
    });
  }, [availableStories, query, selectedStory]);

  const updatePaneNode = () => {
    if (!nodeId) return;
    const allNodes = ctx.allNodes.get();
    const paneNode = cloneDeep(allNodes.get(nodeId)) as PaneNode;
    if (paneNode) {
      const updatedNode = {
        ...paneNode,
        codeHookTarget: 'featured-article',
        codeHookPayload: {
          options: JSON.stringify({
            slug: selectedSlug,
            bgColor: bgColor,
          }),
        },
        bgColour: bgColor || undefined,
        isChanged: true,
      };

      // If bgColor is empty, remove the property
      if (!bgColor) {
        delete updatedNode.bgColour;
      }

      ctx.modifyNodes([updatedNode]);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timeoutId = setTimeout(updatePaneNode, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedSlug, bgColor]);

  const handleSelection = (details: { value: string[] }) => {
    const slug = details.value[0] || '';
    setSelectedSlug(slug);
    const story = availableStories.find((s) => s.slug === slug);
    if (story) {
      setQuery(story.title);
    } else {
      setQuery('');
    }
  };

  const renderPreview = () => {
    if (!selectedStory) return null;

    const topics = selectedStory.topics && selectedStory.topics.length > 0 && (
      <div className="flex flex-wrap gap-2 pt-2">
        {selectedStory.topics.map((topic) => (
          <span
            key={topic}
            className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold text-cyan-800"
          >
            {topic}
          </span>
        ))}
      </div>
    );

    // Mobile is the default, single-column layout
    if ($viewportKey.value === 'mobile') {
      return (
        <div className="flex flex-col gap-8 pt-4">
          <div className="w-full">
            <p className="font-action text-md mb-4 font-bold uppercase text-gray-500">
              Featured Article
            </p>
            <div className="space-y-6">
              <h2 className="text-4xl font-bold leading-snug">
                {selectedStory.title}
              </h2>
              <p className="text-lg leading-loose text-gray-700">
                {selectedStory.description}
              </p>
              {topics}
            </div>
          </div>
          <div className="w-full">
            <img
              src={selectedStory.thumbSrc}
              srcSet={selectedStory.thumbSrcSet}
              alt={`Preview of ${selectedStory.title}`}
              className="w-full rounded-lg shadow-lg"
              style={{ aspectRatio: '1200 / 630' }}
            />
          </div>
        </div>
      );
    }

    // Tablet and Desktop share the same two-column layout
    return (
      <div className="flex flex-row items-center gap-12 pt-4">
        <div className="w-3/5">
          <p className="font-action text-md mb-4 font-bold uppercase text-gray-500">
            Featured Article
          </p>
          <div className="space-y-6">
            <h2 className="text-5xl font-bold leading-snug">
              {selectedStory.title}
            </h2>
            <p className="text-lg leading-loose text-gray-700">
              {selectedStory.description}
            </p>
            {topics}
          </div>
        </div>
        <div className="w-2/5">
          <img
            src={selectedStory.thumbSrc}
            srcSet={selectedStory.thumbSrcSet}
            alt={`Preview of ${selectedStory.title}`}
            className="w-full rounded-lg shadow-lg"
            style={{ aspectRatio: '1200 / 630' }}
          />
        </div>
      </div>
    );
  };

  if (!isPanelOpen) {
    return (
      <div className="flex min-h-48 w-full flex-col items-center justify-center space-y-6 rounded-lg bg-slate-50 p-6">
        <button
          onClick={() => setIsPanelOpen(true)}
          className="rounded-lg bg-cyan-600 px-6 py-3 font-bold text-white shadow-md transition-colors hover:bg-cyan-700"
        >
          {selectedStory
            ? 'Edit Featured Article'
            : 'Configure Featured Article'}
        </button>
        {selectedStory && (
          <div className="mt-3 text-center text-sm text-gray-600">
            Currently featuring:
            <br />
            <span className="font-bold">{selectedStory.title}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 bg-slate-50 p-6">
      <style>{comboboxItemStyles}</style>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Configure Featured Article
        </h2>
        <button
          onClick={() => setIsPanelOpen(false)}
          className="rounded bg-gray-200 px-4 py-2 font-bold text-gray-800 transition-colors hover:bg-gray-300"
        >
          Close
        </button>
      </div>

      <div className="rounded-lg bg-white p-4 shadow">
        <label className="block text-sm font-bold text-gray-700">
          Select an Article
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Only articles with a description, content, and thumbnail will be
          shown.
        </p>
        <Combobox.Root
          collection={collection}
          value={selectedSlug ? [selectedSlug] : []}
          inputValue={query}
          onValueChange={handleSelection}
          onInputValueChange={(details) => setQuery(details.inputValue)}
          className="mt-2"
        >
          <div className="relative">
            <Combobox.Input
              className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="Search for an article..."
            />
            <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Trigger>
          </div>
          <Combobox.Content className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {collection.items.map((item) => (
              <Combobox.Item
                key={item.slug}
                item={item}
                className="combo-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
              >
                <span className="block truncate">{item.title}</span>
                <span className="check-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                </span>
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Root>
      </div>

      <div className="rounded-lg bg-white p-4 shadow">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-bold text-gray-900">Display Settings</h3>
        </div>
        <div className="space-y-4 pt-4">
          <div>
            <ColorPickerCombo
              title="Background Color"
              defaultColor={bgColor}
              onColorChange={(color: string) => setBgColor(color)}
              config={config!}
              allowNull={true}
            />
            <p className="mt-1 text-xs text-gray-500">
              Set a background color for the featured article section
            </p>
          </div>
        </div>
      </div>

      {selectedStory && (
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="border-b border-gray-200 pb-2 text-lg font-bold">
            Live Preview
          </h3>
          {renderPreview()}
        </div>
      )}
    </div>
  );
};

export default FeaturedArticleSetup;
