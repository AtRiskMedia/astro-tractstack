import { useStore } from '@nanostores/react';
import {
  cartStore,
  addQueue,
  getCartItemKey,
  type CartAction,
} from '@/stores/shopify';
import type { ResourceNode } from '@/types/compositorTypes';

interface Props {
  resources: Record<string, ResourceNode[]>;
  options?: {
    params?: {
      options?: string;
    };
  };
}

const HEX_BG_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export default function ShopifyServiceList({ resources = {}, options }: Props) {
  const cart = useStore(cartStore);

  const products = resources['product'] || [];
  let services = resources['service'] || [];

  let group = '';
  let title = '';
  let bgColor = '#f9f9f9';
  try {
    const parsedOptions = JSON.parse(options?.params?.options || '{}');
    group = typeof parsedOptions.group === 'string' ? parsedOptions.group : '';
    if (typeof parsedOptions.title === 'string') {
      title = parsedOptions.title.trim();
    }
    const rawBg = parsedOptions.bgColor;
    if (typeof rawBg === 'string' && HEX_BG_RE.test(rawBg)) {
      bgColor = rawBg;
    }
  } catch (e) {
    // Ignore JSON parse errors
  }

  if (group) {
    services = services.filter((s) => s.optionsPayload?.group === group);
  }

  const boundServiceSlugs = new Set(
    products
      .map((p) => p.optionsPayload?.serviceBound as string | undefined)
      .filter((s): s is string => !!s)
  );

  const displayServices = services.filter(
    (s) => !boundServiceSlugs.has(s.slug)
  );

  const getServiceVariantId = (resource: ResourceNode): string | undefined => {
    try {
      if (resource.optionsPayload?.shopifyData) {
        const data = JSON.parse(resource.optionsPayload.shopifyData);
        // Handle both raw product data and simplified product objects
        const product = data.products?.[0] || data;
        return product?.variants?.[0]?.id;
      }
    } catch (e) {
      return undefined;
    }
    return undefined;
  };

  const handleToggle = (resource: ResourceNode, currentQuantity: number) => {
    const actionType = currentQuantity > 0 ? 'remove' : 'add';

    const variantId = getServiceVariantId(resource);
    let gid: string | undefined;

    try {
      if (resource.optionsPayload?.shopifyData) {
        const data = JSON.parse(resource.optionsPayload.shopifyData);
        const product = data.products?.[0] || data;
        gid = product?.id;
      }
    } catch (e) {}

    const newAction: CartAction = {
      resourceId: resource.id,
      gid,
      variantId,
      action: actionType,
    };
    addQueue.set([...addQueue.get(), newAction]);
  };

  if (!displayServices || displayServices.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      <div
        className="flex w-full flex-col p-12 md:p-12 xl:p-16"
        style={{ backgroundColor: bgColor }}
      >
        {title ? (
          <header className="max-w-4xl">
            <h3
              className="mb-6 text-balance font-action text-2xl font-bold md:text-3xl xl:text-4xl"
              style={{ color: '#2d2923' }}
            >
              {title}
            </h3>
          </header>
        ) : null}
        <section className="w-full">
          <div className="space-y-4">
            {displayServices.map((resource) => {
              const variantId = getServiceVariantId(resource);
              const key = getCartItemKey({
                resourceId: resource.id,
                variantId,
              });

              const cartItem = cart[key];
              const isSelected = (cartItem?.quantity || 0) > 0;
              const duration = resource.optionsPayload?.bookingLengthMinutes;

              return (
                <div
                  key={resource.id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">
                        {resource.title}
                      </h3>
                      {duration && (
                        <span className="inline-flex items-center rounded-sm bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {duration} mins
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {resource.oneliner}
                    </p>
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() =>
                        handleToggle(resource, cartItem?.quantity || 0)
                      }
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isSelected ? 'bg-black' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={isSelected}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isSelected ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
