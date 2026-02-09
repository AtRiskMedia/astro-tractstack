import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import {
  addQueue,
  cartStore,
  cartState,
  CART_STATES,
  type CartAction,
} from '@/stores/shopify';
import { getShopifyImage } from '@/utils/helpers';
import {
  calculateCartDuration,
  MAX_LENGTH_MINUTES,
} from '@/utils/customHelpers';
import type { ResourceNode } from '@/types/compositorTypes';

interface CartProps {
  resources: ResourceNode[];
}

const getCleanVariantTitle = (variant: any) => {
  if (variant?.selectedOptions) {
    return variant.selectedOptions
      .filter((o: any) => o.name !== 'Mode')
      .map((o: any) => o.value)
      .join(' / ');
  }
  return variant?.title || '';
};

export default function Cart({ resources = [] }: CartProps) {
  const cart = useStore(cartStore);
  const [pickupEnabled, setPickupEnabled] = useState(false);

  const cartValues = Object.values(cart);
  const currentDuration = calculateCartDuration(cart, resources);

  const boundServiceIds = new Set(
    cartValues
      .map((item: any) => item.boundResourceId)
      .filter((id) => !!id) as string[]
  );

  const displayItems = cartValues.filter(
    (item) => !boundServiceIds.has(item.resourceId)
  );

  const hasService = cartValues.some((item) => {
    const resource = resources.find((r) => r.id === item.resourceId);
    return !!resource?.optionsPayload?.bookingLengthMinutes;
  });

  useEffect(() => {
    if (hasService) {
      setPickupEnabled(true);
    } else {
      setPickupEnabled(false);
    }
  }, [hasService]);

  const isPickupMode = hasService && pickupEnabled;

  const dispatchDualAction = (
    parentId: string,
    childId: string | undefined,
    action: 'add' | 'remove'
  ) => {
    const queueUpdates: CartAction[] = [];
    queueUpdates.push({ resourceId: parentId, action });
    if (childId) {
      queueUpdates.push({ resourceId: childId, action });
    }
    addQueue.set([...addQueue.get(), ...queueUpdates]);
  };

  if (cartValues.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-8 text-center">
        <h2 className="text-xl font-bold">Your cart is empty</h2>
        <p className="mt-2 text-gray-600">Add some items to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-800">Shopping Cart</h2>
        {hasService && (
          <label className="flex items-center space-x-2 text-sm font-bold text-gray-900">
            <input
              type="checkbox"
              checked={pickupEnabled}
              onChange={(e) => setPickupEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <span>Pick up at Store</span>
          </label>
        )}
      </div>

      <ul className="divide-y divide-gray-200">
        {displayItems.map((item: any) => {
          const resource = resources.find((r) => r.id === item.resourceId);
          if (!resource) return null;

          const isService = !!resource.optionsPayload?.bookingLengthMinutes;
          const itemDuration = Number(
            resource.optionsPayload?.bookingLengthMinutes || 0
          );

          // Determine if adding one more of this item would exceed the limit
          const isAtCapacity =
            currentDuration + itemDuration > MAX_LENGTH_MINUTES;

          const boundServiceId = item.boundResourceId;
          const boundServiceResource = boundServiceId
            ? resources.find((r) => r.id === boundServiceId)
            : null;

          const activeVariantId = isPickupMode
            ? item.variantIdPickup
            : item.variantIdShipped;

          const displayId =
            activeVariantId || item.variantIdPickup || item.variantId;
          const { src, srcSet } = getShopifyImage(resource, '600', displayId);

          let price = '0.00';
          let currency = 'USD';
          let variantTitle = '';

          try {
            if (resource.optionsPayload?.shopifyData) {
              const product = JSON.parse(resource.optionsPayload.shopifyData);
              const variants = product.variants || [];
              const variant = variants.find((v: any) => v.id === displayId);

              if (variant) {
                price = variant.price?.amount || '0.00';
                currency = variant.price?.currencyCode || 'USD';
                variantTitle = getCleanVariantTitle(variant);
              } else if (variants.length > 0) {
                price = variants[0].price?.amount || '0.00';
                currency = variants[0].price?.currencyCode || 'USD';
                variantTitle = getCleanVariantTitle(variants[0]);
              }
            }
          } catch (e) {
            console.error('Price lookup failed for', resource.id);
          }

          return (
            <li
              key={item.resourceId}
              className="flex items-center justify-between p-6"
            >
              <div className="flex items-center">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                  <img
                    src={src}
                    srcSet={srcSet}
                    alt={resource.title}
                    className="aspect-square h-full w-full object-cover object-center"
                    loading="lazy"
                  />
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-bold text-gray-900">
                    {resource.title}
                  </h3>

                  {/* Visual Subtitle for Bound Service */}
                  {boundServiceResource && (
                    <p className="flex items-center text-xs font-bold text-blue-600">
                      <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                      Includes Booking: {boundServiceResource.title}
                    </p>
                  )}

                  <p className="mt-1 text-sm text-gray-500">
                    {resource.oneliner}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {variantTitle && variantTitle !== 'Default Title' && (
                      <span className="text-sm font-bold text-gray-700">
                        {variantTitle}
                      </span>
                    )}

                    {isPickupMode && !isService && (
                      <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800">
                        Store Pickup
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="mr-6 text-right">
                  <p className="text-base font-bold text-gray-900">
                    {price && parseFloat(price) > 0
                      ? `${(parseFloat(price) * item.quantity).toFixed(2)} ${currency}`
                      : 'No Charge'}
                  </p>
                  {price && parseFloat(price) > 0 && !isService && (
                    <p className="text-sm text-gray-500">
                      {parseFloat(price).toFixed(2)} each
                    </p>
                  )}
                </div>

                {/* If this is a Service (standalone), show simple Remove.
                   If this is a Product (possibly bound), show Quantity controls that sync bound service.
                */}
                {isService ? (
                  <button
                    onClick={() =>
                      addQueue.set([
                        ...addQueue.get(),
                        { resourceId: item.resourceId, action: 'remove' },
                      ])
                    }
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100"
                  >
                    Remove
                  </button>
                ) : (
                  <div className="flex items-center rounded-md border border-gray-300">
                    <button
                      onClick={() =>
                        dispatchDualAction(
                          item.resourceId,
                          boundServiceId,
                          'remove'
                        )
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
                        dispatchDualAction(
                          item.resourceId,
                          boundServiceId,
                          'add'
                        )
                      }
                      disabled={isAtCapacity}
                      className={`px-3 py-1 ${
                        isAtCapacity
                          ? 'cursor-not-allowed text-gray-300'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
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
              cartState.set(CART_STATES.CHECKOUT);
            }}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
