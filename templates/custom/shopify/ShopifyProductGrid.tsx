import { useStore } from '@nanostores/react';
import { cartStore, addQueue, type CartAction } from '@/stores/shopify';
import type { ResourceNode } from '@/types/compositorTypes';

interface Props {
  resources: ResourceNode[];
}

export default function ShopifyProductGrid({ resources = [] }: Props) {
  const cart = useStore(cartStore);

  const handleAction = (resourceId: string, action: 'add' | 'remove') => {
    const newAction: CartAction = {
      resourceId,
      action,
    };
    addQueue.set([...addQueue.get(), newAction]);
  };

  if (!resources || resources.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => {
        const cartItem = cart[resource.id];
        const quantity = cartItem?.quantity || 0;

        // Parse the JSON string stored in the CMS
        let shopifyData: any = {};
        try {
          if (resource.optionsPayload?.shopifyData) {
            shopifyData = JSON.parse(resource.optionsPayload.shopifyData);
          }
        } catch (e) {
          console.error(
            'Failed to parse Shopify data for resource:',
            resource.id
          );
        }

        // Extract display price (defensive check)
        const price = shopifyData?.variants?.[0]?.price?.amount;
        const currency =
          shopifyData?.variants?.[0]?.price?.currencyCode || 'USD';

        return (
          <div
            key={resource.id}
            className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-medium text-gray-900">
              {resource.title}
            </h3>
            <p className="mt-2 flex-grow text-sm text-gray-500">
              {resource.oneliner}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900">
                {price ? `${price} ${currency}` : ''}
              </span>
              <div className="flex items-center space-x-3">
                {quantity > 0 ? (
                  <>
                    <button
                      onClick={() => handleAction(resource.id, 'remove')}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                      aria-label="Remove one"
                    >
                      -
                    </button>
                    <span className="text-sm font-medium text-gray-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleAction(resource.id, 'add')}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
                      aria-label="Add one"
                    >
                      +
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleAction(resource.id, 'add')}
                    className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
