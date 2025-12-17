import { useState, useCallback, useMemo, useRef } from 'react';
import { Combobox, Portal } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import { settingsPanelStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';
import {
  isMarkdownPaneFragmentNode,
  isGridLayoutNode,
} from '@/utils/compositor/typeGuards';
import { useDropdownDirection } from '@/utils/helpers';
import type { BasePanelProps } from '@/types/compositorTypes';

// Recommended styles for images
const IMAGE_STYLES = [
  { key: 'objectFIT', title: 'Object Fit' },
  { key: 'maxH', title: 'Max Height' },
  { key: 'maxW', title: 'Max Width' },
  { key: 'aspectRATIO', title: 'Aspect Ratio' },
  { key: 'rounded', title: 'Border Radius' },
  { key: 'shadow', title: 'Box Shadow' },
  { key: 'borderSTYLE', title: 'Border Style' },
  { key: 'borderCOLOR', title: 'Border Color' },
  { key: 'borderWIDTH', title: 'Border Width' },
];

// Recommended styles for image containers (li)
const CONTAINER_STYLES = [
  { key: 'bgCOLOR', title: 'Background Color' },
  { key: 'borderCOLOR', title: 'Border Color' },
  { key: 'borderSTYLE', title: 'Border Style' },
  { key: 'borderWIDTH', title: 'Border Width' },
  { key: 'rounded', title: 'Border Radius' },
  { key: 'shadow', title: 'Box Shadow' },
  { key: 'p', title: 'Padding' },
  { key: 'px', title: 'Padding X' },
  { key: 'py', title: 'Padding Y' },
  { key: 'm', title: 'Margin' },
  { key: 'mx', title: 'Margin X' },
  { key: 'my', title: 'Margin Y' },
];

// Recommended styles for outer containers (ul/ol)
const OUTER_CONTAINER_STYLES = [
  { key: 'bgCOLOR', title: 'Background Color' },
  { key: 'maxW', title: 'Max Width' },
  { key: 'rounded', title: 'Border Radius' },
  { key: 'shadow', title: 'Box Shadow' },
  { key: 'p', title: 'Padding' },
  { key: 'm', title: 'Margin' },
  { key: 'gap', title: 'Gap Between Items' },
  { key: 'columns', title: 'Column Layout' },
];

const getFilteredStyles = (
  showAdvanced: boolean,
  existingClasses: Set<string>
) => {
  return Object.entries(tailwindClasses)
    .filter(
      ([key, details]) =>
        (showAdvanced || details.priority <= 1) && !existingClasses.has(key)
    )
    .map(([key, details]) => ({
      key,
      title: details.title,
      className: details.className,
      prefix: details.prefix,
      values: details.values,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

const StyleImagePanelAdd = ({ node, parentNode, childId }: BasePanelProps) => {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const { openAbove } = useDropdownDirection(comboboxRef);

  if (
    !node?.tagName ||
    !parentNode ||
    (!isMarkdownPaneFragmentNode(parentNode) && !isGridLayoutNode(parentNode))
  )
    return null;

  const isOuterContainer = node.tagName === 'ul' || node.tagName === 'ol';
  const isContainer = node.tagName === 'li';
  const isImage = node.tagName === 'img';

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();

  const targetNode = allNodes.get(node.id);
  if (!targetNode) return null;

  const currentClasses = new Set<string>();

  if (parentNode.defaultClasses?.[node.tagName]) {
    const defaults = parentNode.defaultClasses[node.tagName];
    Object.keys(defaults.mobile).forEach((key) => currentClasses.add(key));
    if (defaults.tablet)
      Object.keys(defaults.tablet).forEach((key) => currentClasses.add(key));
    if (defaults.desktop)
      Object.keys(defaults.desktop).forEach((key) => currentClasses.add(key));
  }

  if (`overrideClasses` in targetNode && targetNode.overrideClasses) {
    Object.values(targetNode.overrideClasses).forEach((viewportClasses) => {
      Object.keys(viewportClasses).forEach((key) => currentClasses.add(key));
    });
  }

  const styles = getFilteredStyles(showAdvanced, currentClasses);
  const filteredStyles =
    query === ''
      ? styles
      : styles.filter(
          (style) =>
            style.title.toLowerCase().includes(query.toLowerCase()) ||
            style.key.toLowerCase().includes(query.toLowerCase())
        );

  const collection = useMemo(() => {
    return createListCollection({
      items: filteredStyles,
      itemToValue: (item) => item.key,
      itemToString: (item) => item.title,
    });
  }, [filteredStyles]);

  const recommendedStyles = isOuterContainer
    ? OUTER_CONTAINER_STYLES
    : isContainer
      ? CONTAINER_STYLES
      : IMAGE_STYLES;

  const availableRecommendedStyles = recommendedStyles.filter(
    (style) => !currentClasses.has(style.key)
  );

  const handleSelect = useCallback(
    (details: { value: string[] }) => {
      const styleKey = details.value[0] || '';
      if (!styleKey) return;

      setSelectedStyle(styleKey);
      settingsPanelStore.set({
        action: isOuterContainer
          ? 'style-img-outer-update'
          : isContainer
            ? 'style-img-container-update'
            : 'style-img-update',
        nodeId: node.id,
        childId,
        className: styleKey,
        expanded: true,
      });
    },
    [node.id, childId, isOuterContainer, isContainer, isImage]
  );

  const handleCancel = () => {
    settingsPanelStore.set({
      action: 'style-image',
      nodeId: childId || node.id,
      expanded: true,
    });
  };

  const elementTypeTitle = isOuterContainer
    ? 'Outer Container'
    : isContainer
      ? 'Container'
      : 'Image';

  const comboboxItemStyles = `
    .style-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .style-item[data-highlighted] .style-indicator {
      color: white;
    }
    .style-item[data-state="checked"] .style-indicator {
      display: flex;
    }
    .style-item .style-indicator {
      display: none;
    }
    .style-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="max-w-md space-y-4">
      <style>{comboboxItemStyles}</style>

      <div className="flex flex-row flex-nowrap justify-between">
        <h3 className="text-xl font-bold">Add Style ({elementTypeTitle})</h3>
        <button
          title="Return to preview pane"
          onClick={handleCancel}
          className="text-myblue hover:text-black"
        >
          Go Back
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="show-advanced"
          checked={showAdvanced}
          onChange={(e) => setShowAdvanced(e.target.checked)}
          className="h-4 w-4 rounded border-mydarkgrey text-cyan-600 focus:ring-cyan-600"
        />
        <label htmlFor="show-advanced" className="text-sm text-mydarkgrey">
          Show Advanced Styles
        </label>
      </div>

      <div className="relative w-full">
        <Combobox.Root
          collection={collection}
          value={selectedStyle ? [selectedStyle] : []}
          onValueChange={handleSelect}
          loopFocus={true}
          openOnKeyPress={true}
          composite={true}
          positioning={{
            placement: openAbove ? 'top' : 'bottom',
            gutter: 4,
            sameWidth: true,
          }}
        >
          <Combobox.Control ref={comboboxRef}>
            <div className="relative">
              <Combobox.Input
                className="w-full rounded-md border-mydarkgrey py-2 pl-3 pr-10 text-xl shadow-sm focus:border-myblue focus:ring-myblue"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search styles..."
              />
              <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-mydarkgrey"
                  aria-hidden="true"
                />
              </Combobox.Trigger>
            </div>
          </Combobox.Control>

          <Portal>
            <Combobox.Positioner style={{ zIndex: 1002 }}>
              <Combobox.Content className="max-h-64 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {collection.items.length === 0 ? (
                  <div className="relative cursor-default select-none px-4 py-2 text-mydarkgrey">
                    Nothing found.
                  </div>
                ) : (
                  collection.items.map((style) => (
                    <Combobox.Item
                      key={style.key}
                      item={style}
                      className="style-item relative cursor-default select-none py-2 pl-10 pr-4 text-black"
                    >
                      <span className="block truncate">
                        {style.title}
                        <span className="ml-2 text-sm opacity-60">
                          {style.className}
                        </span>
                      </span>
                      <span className="style-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </Combobox.Item>
                  ))
                )}
              </Combobox.Content>
            </Combobox.Positioner>
          </Portal>
        </Combobox.Root>
      </div>

      {availableRecommendedStyles.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-lg font-bold">Recommended Styles</h3>
          <div className="flex flex-wrap gap-2">
            {availableRecommendedStyles.map((style) => (
              <button
                key={style.key}
                onClick={() => handleSelect({ value: [style.key] })}
                className="inline-flex items-center rounded-md bg-slate-50 px-3 py-2 text-sm text-black transition-colors duration-200 hover:bg-mygreen/20"
              >
                <span className="font-bold">{style.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleImagePanelAdd;
