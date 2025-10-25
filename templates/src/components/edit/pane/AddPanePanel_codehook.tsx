import { useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { ulid } from 'ulid';
import { Combobox } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronUpDownIcon from '@heroicons/react/20/solid/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/20/solid/CheckIcon';
import { codehookMapStore, fullContentMapStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import { findUniqueSlug } from '@/utils/helpers';
import { PaneAddMode, type TemplatePane } from '@/types/compositorTypes';

interface AddPaneCodeHookPanelProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode) => void;
  isStoryFragment?: boolean;
  isContextPane?: boolean;
}

const AddPaneCodeHookPanel = ({
  nodeId,
  first,
  setMode,
  isStoryFragment = false,
  isContextPane = false,
}: AddPaneCodeHookPanelProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const $contentMap = useStore(fullContentMapStore);

  const existingSlugs = $contentMap
    .filter((item) => ['Pane', 'StoryFragment'].includes(item.type))
    .map((item) => item.slug);

  const hasStoryFragments = useMemo(() => {
    return $contentMap.some((item) => item.type === 'StoryFragment');
  }, [$contentMap]);

  const availableCodeHooks = codehookMapStore.get();

  // Filter hooks based on search query
  const filteredHooks = useMemo(() => {
    // Start with available hooks
    const hooks =
      query === ''
        ? [...availableCodeHooks]
        : availableCodeHooks.filter((hook) =>
            hook.toLowerCase().includes(query.toLowerCase())
          );

    // Create a new array with unavailable hooks removed (don't just filter - we want to show them as disabled)
    return hooks;
  }, [availableCodeHooks, query]);

  // Create collection for Ark UI Combobox
  const collection = useMemo(() => {
    return createListCollection({
      items: filteredHooks,
      itemToValue: (item) => item,
      itemToString: (item) => getDisplayName(item),
    });
  }, [filteredHooks]);

  const isHookAvailable = (hookName: string) => {
    if (
      (hookName === 'featured-content' ||
        hookName === 'list-content' ||
        hookName === 'featured-article') &&
      !hasStoryFragments
    ) {
      return hasStoryFragments;
    }
    return true;
  };

  const getDisplayName = (hookName: string) => {
    if (
      (hookName === 'featured-content' || hookName === 'list-content') &&
      !hasStoryFragments
    ) {
      return `${hookName} (not yet available; no pages found)`;
    }
    return hookName;
  };

  const handleUseCodeHook = () => {
    if (!selected) return;

    // Don't proceed if selected hook is not available
    if (!isHookAvailable(selected)) return;

    const ctx = getCtx();
    const template: TemplatePane = {
      id: ulid(),
      nodeType: 'Pane',
      title: selected,
      slug: findUniqueSlug(
        selected.toLowerCase().replace(/\s+/g, '-'),
        existingSlugs
      ),
      isDecorative: false,
      parentId: '',
      codeHookTarget: selected,
      isContextPane: isContextPane,
    };
    const targetId =
      isStoryFragment || isContextPane
        ? nodeId
        : ctx.getClosestNodeTypeFromId(nodeId, 'StoryFragment');
    const newPaneId = ctx.addTemplatePane(
      targetId,
      template,
      nodeId,
      first ? 'before' : 'after'
    );
    if (newPaneId) {
      ctx.notifyNode('root');
    }
    setSelected(null);
    setQuery('');
    setMode(PaneAddMode.DEFAULT);
  };

  // Handle the combobox selection with validation
  const handleSelection = (details: { value: string[] }) => {
    const hookName = details.value[0] || '';
    if (hookName && isHookAvailable(hookName)) {
      setSelected(hookName);
    } else {
      // Don't set if not available
      setSelected(null);
    }
  };

  // Handle when an item is clicked manually
  const handleItemClick = (hookName: string) => {
    if (isHookAvailable(hookName)) {
      setSelected(hookName);
    }
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .hook-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .hook-item[data-highlighted] .hook-indicator {
      color: white !important;
    }
    .hook-item[data-state="checked"] .hook-indicator {
      display: flex;
    }
    .hook-item .hook-indicator {
      display: none;
    }
    .hook-item[data-state="checked"] {
      font-weight: bold;
    }
    .hook-item-available:hover {
      background-color: #0891b2;
      color: #fff;
    }
    .hook-item-disabled {
      background-color: #f9fafb; /* bg-gray-50 */
      color: #9ca3af; /* text-gray-400 */
      cursor: not-allowed;
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
              Add Code Hook
            </div>
          </div>

          <div className="min-w-[300px] flex-1">
            <Combobox.Root
              collection={collection}
              value={selected ? [selected] : []}
              onValueChange={handleSelection}
              loopFocus={true}
              openOnKeyPress={true}
              composite={true}
            >
              <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition-colors focus-within:border-cyan-500">
                  <Combobox.Input
                    autoComplete="off"
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for a code hook..."
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
                    collection.items.map((hook) => {
                      const isAvailable = isHookAvailable(hook);
                      return (
                        <Combobox.Item
                          key={hook}
                          item={hook}
                          className={`relative cursor-default select-none py-2 pl-10 pr-4 ${
                            !isAvailable
                              ? 'hook-item-disabled'
                              : 'hook-item hook-item-available text-gray-900'
                          }`}
                          onClick={() => isAvailable && handleItemClick(hook)}
                        >
                          <span className="block truncate">
                            {getDisplayName(hook)}
                          </span>
                          <span className="hook-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        </Combobox.Item>
                      );
                    })
                  )}
                </Combobox.Content>
              </div>
            </Combobox.Root>
          </div>

          {selected && (
            <div className="flex min-w-[200px] flex-wrap gap-2">
              <button
                onClick={handleUseCodeHook}
                className="rounded bg-cyan-600 px-3 py-2 text-sm text-white transition-colors hover:bg-cyan-700 focus:bg-cyan-700"
              >
                Use Selected Hook
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
    </div>
  );
};

export default AddPaneCodeHookPanel;
