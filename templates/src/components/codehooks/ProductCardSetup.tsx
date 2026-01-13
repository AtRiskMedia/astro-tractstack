import { useState, useMemo } from 'react';
import { Combobox } from '@ark-ui/react/combobox';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import { useStore } from '@nanostores/react';
import { fullContentMapStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import type { PaneNode } from '@/types/compositorTypes';

interface ProductCardSetupProps {
  nodeId: string;
  params: Record<string, any> | null;
}

export const ProductCardSetup = (props: ProductCardSetupProps) => {
  const { nodeId, params } = props;
  const ctx = getCtx();
  const $contentMap = useStore(fullContentMapStore);

  const [showSelector, setShowSelector] = useState(false);

  const products = useMemo(() => {
    return $contentMap
      .filter(
        (item) => item.type === 'Resource' && item.categorySlug === 'product'
      )
      .map((item) => ({ label: item.title, value: item.slug }));
  }, [$contentMap]);

  const productCollection = useMemo(() => {
    return createListCollection({
      items: products,
      itemToValue: (item) => item.value,
      itemToString: (item) => item.label,
    });
  }, [products]);

  const [selectedItem, setSelectedItem] = useState<{
    label: string;
    value: string;
  } | null>(() => {
    const currentSlug = params?.slug;
    if (currentSlug) {
      return products.find((p) => p.value === currentSlug) || null;
    }
    return null;
  });

  const updatePayload = (newPayload: Record<string, any>) => {
    const paneNode = ctx.allNodes.get().get(nodeId) as PaneNode;
    if (!paneNode) return;

    const updatedPaneNode = {
      ...paneNode,
      codeHookPayload: {
        target: paneNode.codeHookPayload?.target,
        options: JSON.stringify(newPayload),
      },
    };
    ctx.modifyNodes([updatedPaneNode]);
  };

  const handleSelect = (details: { value: string[] }) => {
    const slug = details.value[0];
    const selected = products.find((p) => p.value === slug);
    if (selected) {
      setSelectedItem(selected);
      updatePayload({ slug: selected.value });
      setShowSelector(false);
    }
  };

  const handleClear = () => {
    setSelectedItem(null);
    updatePayload({});
  };

  return (
    <div className="space-y-4 p-2">
      <h3 className="font-bold text-gray-800">Product Card Configuration</h3>

      <div className="rounded-md border bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-600">Selected Product</p>
            <p className="truncate font-bold text-gray-900">
              {selectedItem ? selectedItem.label : 'None'}
            </p>
          </div>
          <div className="flex gap-x-2">
            <button
              type="button"
              onClick={() => setShowSelector(!showSelector)}
              className="rounded bg-white px-3 py-1 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              {showSelector ? 'Cancel' : 'Change'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded bg-white px-3 py-1 text-sm font-bold text-red-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              disabled={!selectedItem}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {showSelector && (
        <div className="space-y-2 rounded-md border p-3">
          <Combobox.Root
            collection={productCollection}
            onValueChange={handleSelect}
            lazyMount
            unmountOnExit
          >
            <Combobox.Label className="text-sm font-bold text-gray-700">
              Find a product
            </Combobox.Label>
            <Combobox.Control>
              <Combobox.Input
                className="w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 md:text-sm"
                placeholder="Search products..."
              />
            </Combobox.Control>
            <Portal>
              <Combobox.Positioner>
                <Combobox.Content className="z-50 max-h-60 overflow-y-auto rounded-md border bg-white shadow-lg">
                  {products.map((item) => (
                    <Combobox.Item
                      key={item.value}
                      item={item}
                      className="relative cursor-pointer select-none px-4 py-2 text-gray-900 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
                    >
                      <Combobox.ItemText>{item.label}</Combobox.ItemText>
                    </Combobox.Item>
                  ))}
                </Combobox.Content>
              </Combobox.Positioner>
            </Portal>
          </Combobox.Root>
        </div>
      )}
    </div>
  );
};

export default ProductCardSetup;
