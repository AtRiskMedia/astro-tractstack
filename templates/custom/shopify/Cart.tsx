import { useStore } from '@nanostores/react';
import { addQueue, cartStore } from '@/stores/shopify';
import type { ResourceNode } from '@/types/compositorTypes';

interface CartProps {
  resources: ResourceNode[];
}

export default function Cart({ resources = [] }: CartProps) {
  const cart = useStore(cartStore);
  const cartItems = Object.values(cart);

  if (cartItems.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-8 text-center">
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <p className="mt-2 text-gray-600">Add some items to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-800">Shopping Cart</h2>
      </div>

      <ul className="divide-y divide-gray-200">
        {cartItems.map((item) => {
          const resource = resources.find((r) => r.id === item.resourceId);
          if (!resource) return null;

          const isService = resource.categorySlug === 'service';

          let shopifyData: any = {};
          try {
            shopifyData = resource.optionsPayload?.shopifyData
              ? JSON.parse(resource.optionsPayload.shopifyData)
              : {};
          } catch (e) {}

          const price = shopifyData?.variants?.[0]?.price?.amount;
          const currency = shopifyData?.variants?.[0]?.price?.currencyCode;

          return (
            <li
              key={item.resourceId}
              className="flex items-center justify-between p-6"
            >
              <div className="flex items-center">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                  <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                    IMG
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-bold text-gray-900">
                    {resource.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {resource.oneliner}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="mr-6 text-right">
                  <p className="text-base font-bold text-gray-900">
                    {price
                      ? `${(parseFloat(price) * item.quantity).toFixed(2)} ${currency}`
                      : 'No Charge'}
                  </p>
                  {price && !isService && (
                    <p className="text-sm text-gray-500">
                      {parseFloat(price).toFixed(2)} each
                    </p>
                  )}
                </div>

                {isService ? (
                  <button
                    onClick={() =>
                      addQueue.set([
                        ...addQueue.get(),
                        { resourceId: item.resourceId, action: 'remove' },
                      ])
                    }
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Remove
                  </button>
                ) : (
                  <div className="flex items-center rounded-md border border-gray-300">
                    <button
                      onClick={() =>
                        addQueue.set([
                          ...addQueue.get(),
                          { resourceId: item.resourceId, action: 'remove' },
                        ])
                      }
                      className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="border-l border-r border-gray-300 px-3 py-1 text-gray-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        addQueue.set([
                          ...addQueue.get(),
                          { resourceId: item.resourceId, action: 'add' },
                        ])
                      }
                      className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-b-lg border-t border-gray-200 bg-gray-50 px-6 py-6">
        <div className="flex justify-end">
          <button
            className="rounded-lg bg-black px-6 py-3 font-bold text-white transition-colors hover:bg-gray-800"
            onClick={() => {
              console.log(`checkout rough in`);
            }}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
