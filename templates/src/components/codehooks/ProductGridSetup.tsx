import { useState, useMemo, useEffect, useRef } from 'react';
import {
  RadioGroup,
  type RadioGroup as RadioGroupNamespace,
} from '@ark-ui/react/radio-group';
import { Combobox } from '@ark-ui/react/combobox';
import { Portal } from '@ark-ui/react/portal';
import { createListCollection } from '@ark-ui/react/collection';
import { useStore } from '@nanostores/react';
import { fullContentMapStore } from '@/stores/storykeep';
import { getCtx } from '@/stores/nodes';
import CheckCircleIcon from '@heroicons/react/20/solid/CheckCircleIcon';
import type { PaneNode } from '@/types/compositorTypes';
import type { BrandConfig } from '@/types/tractstack';

interface ProductGridSetupProps {
  nodeId: string;
  params: Record<string, any> | null;
  config: BrandConfig;
}

const modes = [
  {
    id: 'all',
    title: 'All Products',
    description: 'Display all products from the catalog.',
  },
  {
    id: 'type',
    title: 'By Product Type',
    description: 'Filter products by a specific type.',
  },
  {
    id: 'specific',
    title: 'Specific Products',
    description: 'Manually select individual products.',
  },
];

export const ProductGridSetup = (props: ProductGridSetupProps) => {
  const { nodeId, params } = props;
  const ctx = getCtx();
  const $contentMap = useStore(fullContentMapStore);
  const isInitialMount = useRef(true);

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

  const [selectionMode, setSelectionMode] = useState<
    'all' | 'type' | 'specific'
  >(() => {
    if (params?.slugs !== undefined) return 'specific';
    if (params?.productType !== undefined) return 'type';
    return 'all';
  });

  const [productType, setProductType] = useState(
    () => params?.productType || ''
  );

  const [selectedItems, setSelectedItems] = useState<
    { label: string; value: string }[]
  >(() => {
    if (params?.slugs !== undefined) {
      const slugs =
        typeof params.slugs === 'string' && params.slugs
          ? params.slugs.split(',')
          : [];
      return products.filter((p) => slugs.includes(p.value));
    }
    return [];
  });

  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const constructPayload = () => {
      if (selectionMode === 'all') {
        return { category: 'product' };
      }
      if (selectionMode === 'type') {
        return { category: 'product', productType: productType };
      }
      if (selectionMode === 'specific') {
        const slugs = selectedItems.map((item) => item.value).join(',');
        if (slugs) {
          return { slugs };
        }
        return {}; // Return empty if no slugs are selected
      }
      return {};
    };

    const timeoutId = setTimeout(() => {
      const paneNode = ctx.allNodes.get().get(nodeId) as PaneNode;
      if (!paneNode) return;

      const updatedPaneNode = {
        ...paneNode,
        codeHookPayload: {
          target: paneNode.codeHookPayload?.target,
          options: JSON.stringify(constructPayload()),
        },
        isChanged: true,
      };
      ctx.modifyNodes([updatedPaneNode]);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectionMode, productType, selectedItems]);

  const handleModeChange = (
    details: RadioGroupNamespace.ValueChangeDetails
  ) => {
    if (details.value) {
      setSelectionMode(details.value as 'all' | 'type' | 'specific');
      setShowSelector(false);
    }
  };

  const handleMultiSelectChange = (details: { value: string[] }) => {
    const newSelection = products.filter((p) =>
      details.value.includes(p.value)
    );
    setSelectedItems(newSelection);
  };

  const radioGroupStyles = `
    .radio-item[data-state="checked"] { background-color: #f0f9ff; border-color: #0284c7; }
    .radio-item[data-state="checked"] .check-icon { display: flex; }
    .radio-item .check-icon { display: none; }
  `;

  return (
    <div className="space-y-4 p-2">
      <style>{radioGroupStyles}</style>
      <h3 className="font-bold text-gray-800">Product Grid Configuration</h3>

      <RadioGroup.Root
        className="grid grid-cols-1 gap-4"
        defaultValue={selectionMode}
        onValueChange={handleModeChange}
      >
        {modes.map((option) => (
          <RadioGroup.Item
            key={option.id}
            value={option.id}
            className="radio-item relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none"
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center">
                <RadioGroup.ItemControl className="hidden" />
                <div className="flex flex-col">
                  <RadioGroup.ItemText className="block text-sm font-bold text-gray-900">
                    {option.title}
                  </RadioGroup.ItemText>
                  <RadioGroup.ItemText className="flex items-center text-sm text-gray-500">
                    {option.description}
                  </RadioGroup.ItemText>
                </div>
              </div>
              <div className="check-icon hidden shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
            <RadioGroup.ItemHiddenInput />
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>

      {selectionMode === 'type' && (
        <div className="space-y-2 rounded-md border p-3">
          <label
            htmlFor="productType"
            className="text-sm font-bold text-gray-700"
          >
            Product Type
          </label>
          <input
            type="text"
            id="productType"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            placeholder="e.g., 'electronics'"
            className="w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
          />
        </div>
      )}

      {selectionMode === 'specific' && (
        <div className="rounded-md border bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-600">
                Selected Products
              </p>
              <p className="font-bold text-gray-900">
                {selectedItems.length} item(s) selected
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSelector(!showSelector)}
              className="rounded bg-white px-3 py-1 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              {showSelector ? 'Close' : 'Change Selection'}
            </button>
          </div>

          {showSelector && (
            <div className="mt-4 space-y-2">
              <Combobox.Root
                collection={productCollection}
                value={selectedItems.map((item) => item.value)}
                onValueChange={handleMultiSelectChange}
                multiple
                lazyMount
                unmountOnExit
              >
                <Combobox.Label className="text-sm font-bold text-gray-700">
                  Find products to include
                </Combobox.Label>
                <Combobox.Control>
                  <Combobox.Input
                    className="w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
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
                          className="relative flex cursor-pointer select-none items-center px-4 py-2 text-gray-900 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
                        >
                          <Combobox.ItemText>{item.label}</Combobox.ItemText>
                          <Combobox.ItemIndicator className="ml-auto">
                            <CheckCircleIcon className="h-5 w-5" />
                          </Combobox.ItemIndicator>
                        </Combobox.Item>
                      ))}
                    </Combobox.Content>
                  </Combobox.Positioner>
                </Portal>
              </Combobox.Root>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductGridSetup;
