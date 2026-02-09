import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore, addQueue, type CartAction } from '@/stores/shopify';
import { getShopifyImage } from '@/utils/helpers';
import type { ResourceNode } from '@/types/compositorTypes';

interface Props {
  resources: Record<string, ResourceNode[]>;
}

interface ShopifyOption {
  name: string;
  values: string[];
}

interface ShopifyVariant {
  id: string;
  title: string;
  price: { amount: string; currencyCode: string };
  selectedOptions: { name: string; value: string }[];
}

interface ProductCardProps {
  resource: ResourceNode;
  allServices: ResourceNode[];
}

function ProductCard({ resource, allServices }: ProductCardProps) {
  const cart = useStore(cartStore);
  const cartItem = cart[resource.id];
  const quantity = cartItem?.quantity || 0;

  const serviceBoundSlug = resource.optionsPayload?.serviceBound as
    | string
    | undefined;

  const boundServiceResource = serviceBoundSlug
    ? allServices.find((r) => r.slug === serviceBoundSlug)
    : undefined;

  let product: any = {};
  try {
    if (resource.optionsPayload?.shopifyData) {
      product = JSON.parse(resource.optionsPayload.shopifyData);
    }
  } catch (e) {
    console.error('Failed to parse Shopify data', resource.id);
  }

  const options: ShopifyOption[] = product?.options || [];
  const variants: ShopifyVariant[] = product?.variants || [];

  const isUnconfigured = options.some((o) => o.name === 'Title');

  if (isUnconfigured) {
    return null;
  }

  const hasModeOption = options.some((o) => o.name === 'Mode');
  const visibleOptions = options.filter((o) => o.name !== 'Mode');

  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    visibleOptions.forEach((opt) => {
      initial[opt.name] = opt.values[0];
    });
    return initial;
  });

  const getVariant = (targetMode: 'Shipped' | 'Pickup' | null) => {
    const found = variants.find((v) => {
      const optionsMatch = visibleOptions.every((opt) => {
        const variantOpt = v.selectedOptions.find((o) => o.name === opt.name);
        return variantOpt?.value === selections[opt.name];
      });

      if (!optionsMatch) return false;

      if (hasModeOption && targetMode) {
        const modeOpt = v.selectedOptions.find((o) => o.name === 'Mode');
        return modeOpt?.value === targetMode;
      }

      return true;
    });

    return found;
  };

  const currentDisplayVariant =
    getVariant('Shipped') || getVariant('Pickup') || variants[0];
  const price = currentDisplayVariant?.price?.amount;
  const currency = currentDisplayVariant?.price?.currencyCode || 'USD';
  const { src, srcSet } = getShopifyImage(
    resource,
    '600',
    currentDisplayVariant?.id
  );

  const handleAction = (action: 'add' | 'remove') => {
    if (action === 'remove') {
      const queueUpdates: CartAction[] = [];

      queueUpdates.push({
        resourceId: resource.id,
        action: 'remove',
      });

      if (boundServiceResource) {
        queueUpdates.push({
          resourceId: boundServiceResource.id,
          action: 'remove',
        });
      }

      addQueue.set([...addQueue.get(), ...queueUpdates]);
      return;
    }

    const variantShipped = getVariant(hasModeOption ? 'Shipped' : null);
    const variantPickup = getVariant(hasModeOption ? 'Pickup' : null);

    const queueUpdates: CartAction[] = [];

    const productAction: CartAction & { boundResourceId?: string } = {
      resourceId: resource.id,
      gid: product?.id,
      variantIdShipped: variantShipped?.id,
      variantIdPickup: variantPickup?.id,
      action: 'add',
      boundResourceId: boundServiceResource?.id,
    };
    queueUpdates.push(productAction);

    if (boundServiceResource) {
      queueUpdates.push({
        resourceId: boundServiceResource.id,
        action: 'add',
      });
    } else if (serviceBoundSlug) {
      console.warn(
        `[Shopify] Service bound to slug '${serviceBoundSlug}' was not found in provided resources.`
      );
    }

    addQueue.set([...addQueue.get(), ...queueUpdates]);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={src}
          srcSet={srcSet}
          alt={resource.title}
          className="h-full w-full object-cover object-center"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold text-gray-900">{resource.title}</h3>
        <p className="mt-2 flex-grow text-sm text-gray-500">
          {resource.oneliner}
        </p>

        {boundServiceResource && (
          <div className="mt-2 w-fit rounded bg-blue-50 p-3 text-xs font-bold text-blue-700">
            Includes {boundServiceResource.title}
          </div>
        )}

        {visibleOptions.length > 0 && (
          <div className="mt-4 w-fit space-y-3 p-1">
            {visibleOptions.map((opt) => (
              <div key={opt.name}>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  {opt.name}
                </label>
                <select
                  value={selections[opt.name]}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setSelections((prev) => ({
                      ...prev,
                      [opt.name]: newVal,
                    }));
                  }}
                  className="block w-full rounded-md border-gray-300 p-2 text-sm shadow-sm focus:border-black focus:ring-black"
                >
                  {opt.values.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-base font-bold text-gray-900">
            {price ? `${price} ${currency}` : ''}
          </span>
          <div className="flex items-center space-x-3">
            {quantity > 0 ? (
              <>
                <button
                  onClick={() => handleAction('remove')}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                  aria-label="Remove one"
                >
                  -
                </button>
                <span className="text-sm font-bold text-gray-900">
                  {quantity}
                </span>
                <button
                  onClick={() => handleAction('add')}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                  aria-label="Add one"
                >
                  +
                </button>
              </>
            ) : (
              <button
                onClick={() => handleAction('add')}
                className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
              >
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopifyProductGrid({ resources = {} }: Props) {
  const products = resources['product'] || [];
  const services = resources['service'] || [];

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {products.map((resource) => (
        <ProductCard
          key={resource.id}
          resource={resource}
          allServices={services}
        />
      ))}
    </div>
  );
}
