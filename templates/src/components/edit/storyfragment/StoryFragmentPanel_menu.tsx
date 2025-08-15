import { useState, useEffect, useMemo } from 'react';
import { Combobox } from '@ark-ui/react';
import { createListCollection } from '@ark-ui/react/collection';
import ChevronUpDownIcon from '@heroicons/react/24/outline/ChevronUpDownIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { getCtx } from '@/stores/nodes';
import { cloneDeep } from '@/utils/helpers';
import {
  StoryFragmentMode,
  type StoryFragmentNode,
  type MenuNode,
} from '@/types/compositorTypes';
import MenuForm from '@/components/storykeep/controls/content/MenuForm';
import { fullContentMapStore, getFullContentMap } from '@/stores/analytics';
import type { FullContentMapItem } from '@/types/tractstack';

interface StoryFragmentMenuPanelProps {
  nodeId: string;
  setMode: (mode: StoryFragmentMode) => void;
}

const StoryFragmentMenuPanel = ({
  nodeId,
  setMode,
}: StoryFragmentMenuPanelProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const storyfragmentNode = allNodes.get(nodeId) as StoryFragmentNode;

  const [menus, setMenus] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(
    storyfragmentNode?.menuId || null
  );
  const [query, setQuery] = useState('');
  const [selectedMenu, setSelectedMenu] = useState<MenuNode | null>(null);
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [contentMap, setContentMap] = useState<FullContentMapItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const goBackend =
          import.meta.env.PUBLIC_GO_BACKEND || 'http://localhost:8080';
        const tenantId = import.meta.env.PUBLIC_TENANTID || 'default';

        // Fetch content map if store is empty
        const currentContentMap = fullContentMapStore.get();
        if (
          !currentContentMap ||
          !currentContentMap.data ||
          currentContentMap.data.length === 0
        ) {
          const contentMapData = await getFullContentMap(tenantId);
          setContentMap(contentMapData);
        } else {
          setContentMap(currentContentMap.data);
        }

        // Step 1: Get all menu IDs
        const idsResponse = await fetch(`${goBackend}/api/v1/nodes/menus`, {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        });

        if (!idsResponse.ok) {
          throw new Error(
            `Failed to fetch menu IDs: ${idsResponse.statusText}`
          );
        }
        const { menuIds } = await idsResponse.json();

        if (!menuIds || menuIds.length === 0) {
          setMenus([]);
          return;
        }

        // Step 2: Get menu data by IDs
        const menusResponse = await fetch(`${goBackend}/api/v1/nodes/menus`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify({ menuIds }),
        });

        if (!menusResponse.ok) {
          throw new Error(`Failed to fetch menus: ${menusResponse.statusText}`);
        }

        const { menus } = await menusResponse.json();
        setMenus(menus || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch menus');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedMenuId) {
      const menu = menus.find((menu) => menu.id === selectedMenuId);
      setSelectedMenu(menu || null);
    } else {
      setSelectedMenu(null);
    }
  }, [selectedMenuId, menus]);

  const filteredMenus =
    query === ''
      ? menus
      : menus.filter((menu) =>
          menu.title.toLowerCase().includes(query.toLowerCase())
        );

  const collection = useMemo(
    () =>
      createListCollection<MenuNode>({
        items: filteredMenus,
        itemToValue: (item) => item.id,
        itemToString: (item) => item.title,
      }),
    [filteredMenus]
  );

  const handleMenuSelect = (details: { value: string[] }) => {
    const menuId = details.value[0] || null;
    setSelectedMenuId(menuId);

    const updatedNode = {
      ...cloneDeep(storyfragmentNode),
      menuId: menuId,
      isChanged: true,
    };
    ctx.modifyNodes([updatedNode]);
  };

  const handleUnlinkMenu = () => {
    const updatedNode = {
      ...cloneDeep(storyfragmentNode),
      menuId: null,
      isChanged: true,
    };
    ctx.modifyNodes([updatedNode]);
    setSelectedMenuId(null);
    setSelectedMenu(null);
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .menu-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .menu-item[data-highlighted] .menu-indicator {
      color: white;
    }
    .menu-item[data-state="checked"] .menu-indicator {
      display: flex;
    }
    .menu-item .menu-indicator {
      display: none;
    }
    .menu-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  if (loading) return <div className="px-3.5 py-6">Loading menus...</div>;
  if (error)
    return <div className="px-3.5 py-6 text-red-500">Error: {error}</div>;

  return (
    <div className="group mb-4 w-full rounded-b-md bg-white px-1.5 py-6">
      <style>{comboboxItemStyles}</style>

      <div className="px-3.5">
        <div className="mb-4 flex justify-between">
          <h3 className="text-lg font-bold">Menu Configuration</h3>
          <button
            onClick={() => setMode(StoryFragmentMode.DEFAULT)}
            className="text-myblue hover:text-black"
          >
            ← Close Panel
          </button>
        </div>

        {selectedMenu ? (
          <>
            <div className="mb-4 rounded-md bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-lg font-bold">{selectedMenu.title}</h4>
                <button
                  onClick={handleUnlinkMenu}
                  className="flex items-center text-red-600 hover:text-red-800"
                >
                  <XMarkIcon className="mr-1 h-5 w-5" />
                  Unlink menu from this page
                </button>
              </div>
              <p className="text-gray-600">
                This menu has {selectedMenu.optionsPayload.length} links.
              </p>
              {!showMenuEditor && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowMenuEditor(true)}
                    className="rounded bg-cyan-700 px-4 py-2 text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    Edit Menu
                  </button>
                </div>
              )}
            </div>

            {showMenuEditor && (
              <div
                className="fixed inset-0 overflow-y-auto"
                style={{ zIndex: 9005 }}
              >
                <div className="flex min-h-screen items-center justify-center p-1.5">
                  <div
                    className="fixed inset-0 bg-black opacity-65"
                    onClick={() => setShowMenuEditor(false)}
                  />

                  <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl">
                    <div className="absolute right-4 top-4 z-10">
                      <button
                        onClick={() => setShowMenuEditor(false)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white bg-opacity-90 shadow-lg transition-all duration-200 hover:bg-opacity-100"
                        title="Close Menu Editor"
                        aria-label="Close Menu Editor"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="p-6">
                      <MenuForm
                        menu={selectedMenu}
                        isCreate={false}
                        contentMap={contentMap}
                        onClose={async (saved) => {
                          setShowMenuEditor(false);
                          if (saved) {
                            try {
                              const tenantId =
                                import.meta.env.PUBLIC_TENANTID || 'default';
                              const refreshedContentMap =
                                await getFullContentMap(tenantId);
                              setContentMap(refreshedContentMap);
                            } catch (error) {
                              console.error(
                                'Failed to refresh content map:',
                                error
                              );
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="max-w-md space-y-6">
            <div className="relative">
              <Combobox.Root
                collection={collection}
                value={selectedMenuId ? [selectedMenuId] : []}
                onValueChange={handleMenuSelect}
                loopFocus={true}
                openOnKeyPress={true}
                composite={true}
              >
                <div className="relative">
                  <Combobox.Input
                    className="border-mydarkgrey focus:border-myblue focus:ring-myblue w-full rounded-md border py-2 pl-3 pr-10 text-sm shadow-sm"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Select a menu..."
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      className="text-mydarkgrey h-5 w-5"
                      aria-hidden="true"
                    />
                  </Combobox.Trigger>
                </div>
                <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {filteredMenus.length === 0 && query !== '' ? (
                    <div className="text-mydarkgrey relative cursor-default select-none px-4 py-2">
                      Nothing found.
                    </div>
                  ) : (
                    filteredMenus.map((menu) => (
                      <Combobox.Item
                        key={menu.id}
                        item={menu}
                        className="menu-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                      >
                        <span className="block truncate">{menu.title}</span>
                        <span className="menu-indicator text-myblue absolute inset-y-0 left-0 flex items-center pl-3">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </Combobox.Item>
                    ))
                  )}
                </Combobox.Content>
              </Combobox.Root>
            </div>
            <p className="text-gray-600">
              Select an existing menu to link to this page. To create new menus,
              use the Menu Manager in the main Story Keep dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryFragmentMenuPanel;
