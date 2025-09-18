import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Combobox, Portal } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import {
  styleElementInfoStore,
  resetStyleElementInfo,
  settingsPanelStore,
} from '@/stores/storykeep';
import { tailwindClasses } from '@/utils/compositor/tailwindClasses';
import { isMarkdownPaneFragmentNode } from '@/utils/compositor/typeGuards';
import { useDropdownDirection } from '@/utils/helpers';
import {
  tagTitles,
  type Tag,
  type BasePanelProps,
} from '@/types/compositorTypes';

const RECOMMENDED_STYLES: {
  [key: string]: Array<{ key: string; title: string }>;
} = {
  p: [
    { key: 'textSIZE', title: 'Text Size' },
    { key: 'textCOLOR', title: 'Text Color' },
    { key: 'lineHEIGHT', title: 'Line Height' },
    { key: 'mt', title: 'Margin Top' },
    { key: 'mb', title: 'Margin Bottom' },
    { key: 'fontWEIGHT', title: 'Font Weight' },
    { key: 'textALIGN', title: 'Text Align' },
  ],
  h2: [
    { key: 'textSIZE', title: 'Text Size' },
    { key: 'textCOLOR', title: 'Text Color' },
    { key: 'fontWEIGHT', title: 'Font Weight' },
    { key: 'fontFACE', title: 'Font Family' },
    { key: 'mt', title: 'Margin Top' },
    { key: 'mb', title: 'Margin Bottom' },
    { key: 'textALIGN', title: 'Text Align' },
  ],
  h3: [
    { key: 'textSIZE', title: 'Text Size' },
    { key: 'textCOLOR', title: 'Text Color' },
    { key: 'fontWEIGHT', title: 'Font Weight' },
    { key: 'fontFACE', title: 'Font Family' },
    { key: 'mt', title: 'Margin Top' },
    { key: 'mb', title: 'Margin Bottom' },
  ],
  h4: [
    { key: 'textSIZE', title: 'Text Size' },
    { key: 'textCOLOR', title: 'Text Color' },
    { key: 'fontWEIGHT', title: 'Font Weight' },
    { key: 'fontFACE', title: 'Font Family' },
    { key: 'mt', title: 'Margin Top' },
  ],
  h5: [
    { key: 'textSIZE', title: 'Text Size' },
    { key: 'textCOLOR', title: 'Text Color' },
    { key: 'fontWEIGHT', title: 'Font Weight' },
    { key: 'fontFACE', title: 'Font Family' },
    { key: 'mt', title: 'Margin Top' },
  ],
  ul: [
    { key: 'bgCOLOR', title: 'Background Color' },
    { key: 'borderCOLOR', title: 'Border Color' },
    { key: 'borderSTYLE', title: 'Border Style' },
    { key: 'borderWIDTH', title: 'Border Width' },
    { key: 'rounded', title: 'Border Radius' },
    { key: 'shadow', title: 'Box Shadow' },
    { key: 'maxW', title: 'Max Width' },
    { key: 'p', title: 'Padding' },
    { key: 'px', title: 'Padding X' },
    { key: 'py', title: 'Padding Y' },
    { key: 'm', title: 'Margin' },
    { key: 'mx', title: 'Margin X' },
    { key: 'my', title: 'Margin Y' },
  ],
  ol: [
    { key: 'bgCOLOR', title: 'Background Color' },
    { key: 'borderCOLOR', title: 'Border Color' },
    { key: 'borderSTYLE', title: 'Border Style' },
    { key: 'borderWIDTH', title: 'Border Width' },
    { key: 'rounded', title: 'Border Radius' },
    { key: 'shadow', title: 'Box Shadow' },
    { key: 'maxW', title: 'Max Width' },
    { key: 'p', title: 'Padding' },
    { key: 'px', title: 'Padding X' },
    { key: 'py', title: 'Padding Y' },
    { key: 'm', title: 'Margin' },
    { key: 'mx', title: 'Margin X' },
    { key: 'my', title: 'Margin Y' },
  ],
};

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

interface StyleOption {
  key: string;
  title: string;
  className: string;
  prefix: string;
  values: string[];
}

const StyleElementPanelAdd = ({
  node,
  parentNode,
  onTitleChange,
}: BasePanelProps) => {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const { openAbove } = useDropdownDirection(comboboxRef);

  if (
    !node ||
    !node.tagName ||
    !parentNode ||
    !isMarkdownPaneFragmentNode(parentNode)
  ) {
    return null;
  }

  const currentClasses = new Set<string>();

  if (parentNode.defaultClasses?.[node.tagName]) {
    const defaults = parentNode.defaultClasses[node.tagName];
    Object.keys(defaults.mobile).forEach((key) => currentClasses.add(key));
    if (defaults.tablet)
      Object.keys(defaults.tablet).forEach((key) => currentClasses.add(key));
    if (defaults.desktop)
      Object.keys(defaults.desktop).forEach((key) => currentClasses.add(key));
  }

  if (node.overrideClasses) {
    Object.values(node.overrideClasses).forEach((viewportClasses) => {
      Object.keys(viewportClasses).forEach((key) => currentClasses.add(key));
    });
  }

  const styles = getFilteredStyles(showAdvanced, currentClasses);

  const collection = useMemo(
    () =>
      createListCollection({
        items: styles.filter(
          (style) =>
            style.title.toLowerCase().includes(query.toLowerCase()) ||
            style.key.toLowerCase().includes(query.toLowerCase())
        ),
        itemToValue: (item: StyleOption) => item.key,
        itemToString: (item: StyleOption) => item.title,
      }),
    [styles, query]
  );

  const availableRecommendedStyles =
    RECOMMENDED_STYLES[node.tagName]?.filter(
      (style) => !currentClasses.has(style.key)
    ) || [];

  const handleSelect = useCallback(
    (details: { value: string[] }) => {
      const styleKey = details.value[0] || '';
      if (!styleKey) return;

      setSelectedStyle(styleKey);
      styleElementInfoStore.setKey('className', styleKey);
      settingsPanelStore.set({
        nodeId: node.id,
        className: styleKey,
        action: 'style-element-update',
        expanded: true,
      });
    },
    [node.id]
  );

  const handleCancel = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: 'style-element',
      expanded: true,
    });
  };

  useEffect(() => {
    if (node?.tagName && onTitleChange) {
      const tagTitle =
        tagTitles[node.tagName as Tag] || node.tagName.toUpperCase();
      onTitleChange(`Style ${tagTitle}`);
    }
  }, [node?.tagName, onTitleChange]);

  useEffect(() => {
    styleElementInfoStore.set({
      markdownParentId: parentNode.id,
      tagName: node.tagName,
      overrideNodeId: null,
      className: null,
    });

    return () => {
      resetStyleElementInfo();
    };
  }, [parentNode.id, node.tagName]);

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
          className="border-mydarkgrey h-4 w-4 rounded text-cyan-600 focus:ring-cyan-600"
        />
        <label htmlFor="show-advanced" className="text-mydarkgrey text-sm">
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
                className="border-mydarkgrey focus:border-myblue focus:ring-myblue w-full rounded-md py-2 pl-3 pr-10 text-xl shadow-sm"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search styles..."
              />
              <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="text-mydarkgrey h-5 w-5"
                  aria-hidden="true"
                />
              </Combobox.Trigger>
            </div>
          </Combobox.Control>

          <Portal>
            <Combobox.Positioner style={{ zIndex: 1002 }}>
              <Combobox.Content className="max-h-64 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                {collection.items.length === 0 ? (
                  <div className="text-mydarkgrey relative cursor-default select-none px-4 py-2">
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
                className="hover:bg-mygreen/20 inline-flex items-center rounded-md bg-slate-50 px-3 py-2 text-sm text-black transition-colors duration-200"
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

export default StyleElementPanelAdd;
