import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import {
  addQueue,
  cartStore,
  cartState,
  CART_STATES,
  type CartAction,
  type CartItemState,
} from '@/stores/shopify';
import { getShopifyImage } from '@/utils/helpers';
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

  const boundServiceIds = new Set(
    cartValues
      .map((item) => item.boundResourceId)
      .filter((id) => !!id) as string[]
  );

  const hasServiceBoundProduct = boundServiceIds.size > 0;

  const displayableItems = cartValues.filter(
    (item) => !boundServiceIds.has(item.resourceId)
  );

  const groupedItems = displayableItems.reduce(
    (acc, item) => {
      if (!acc[item.resourceId]) {
        acc[item.resourceId] = [];
      }
      acc[item.resourceId].push(item);
      return acc;
    },
    {} as Record<string, CartItemState[]>
  );

  const hasService = cartValues.some((item) => {
    const resource = resources.find((r) => r.id === item.resourceId);
    return !!resource?.optionsPayload?.bookingLengthMinutes;
  });

  const hasPhysicalProductWithPickup = cartValues.some(
    (item) => !!item.variantIdPickup
  );

  const canPickup = hasService && hasPhysicalProductWithPickup;

  useEffect(() => {
    if (hasServiceBoundProduct) {
      setPickupEnabled(true);
    } else if (canPickup) {
      setPickupEnabled(true);
    } else {
      setPickupEnabled(false);
    }
  }, [canPickup, hasServiceBoundProduct]);

  const isPickupMode = (canPickup || hasServiceBoundProduct) && pickupEnabled;

  const dispatchDualAction = (
    item: CartItemState,
    action: 'add' | 'remove'
  ) => {
    const queueUpdates: CartAction[] = [];

    queueUpdates.push({
      resourceId: item.resourceId,
      action,
      variantId: item.variantId,
      variantIdShipped: item.variantIdShipped,
      variantIdPickup: item.variantIdPickup,
      boundResourceId: item.boundResourceId,
      suppressModal: action === 'add' ? true : undefined,
    });

    if (item.boundResourceId) {
      queueUpdates.push({
        resourceId: item.boundResourceId,
        action,
        suppressModal: action === 'add' ? true : undefined,
      });
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
        {hasServiceBoundProduct ? (
          <div className="flex items-center space-x-2 text-sm font-bold text-gray-900">
            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-gray-700">
              Store Pickup Required
            </span>
          </div>
        ) : (
          canPickup && (
            <label className="flex items-center space-x-2 text-sm font-bold text-gray-900">
              <input
                type="checkbox"
                checked={pickupEnabled}
                onChange={(e) => setPickupEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span>Pick up at Store</span>
            </label>
          )
        )}
      </div>

      <ul className="divide-y divide-gray-200">
        {Object.keys(groupedItems).map((resourceId) => {
          const items = groupedItems[resourceId];
          const resource = resources.find((r) => r.id === resourceId);
          if (!resource || items.length === 0) return null;

          const isService = !!resource.optionsPayload?.bookingLengthMinutes;
          const serviceDuration = resource.optionsPayload?.bookingLengthMinutes;

          const firstItem = items[0];
          const boundServiceId = firstItem.boundResourceId;
          const boundServiceResource = boundServiceId
            ? resources.find((r) => r.id === boundServiceId)
            : null;

          const activeVariantIdFirst = isPickupMode
            ? firstItem.variantIdPickup
            : firstItem.variantIdShipped;
          const displayIdFirst =
            activeVariantIdFirst ||
            firstItem.variantIdPickup ||
            firstItem.variantId;
          const { src, srcSet } = getShopifyImage(
            resource,
            '600',
            displayIdFirst
          );

          let productData: any = {};
          try {
            if (resource.optionsPayload?.shopifyData) {
              productData = JSON.parse(resource.optionsPayload.shopifyData);
            }
          } catch (e) {
            console.error('Failed to parse Shopify data', resource.id);
          }
          const variants = productData?.variants || [];

          return (
            <li key={resourceId} className="p-6">
              <div className="flex items-start">
                {!isService && (
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <img
                      src={src}
                      srcSet={srcSet}
                      alt={resource.title}
                      className="aspect-square h-full w-full object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="ml-4 flex-1">
                  <div className="flex justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900">
                          {resource.title}
                        </h3>
                        {isService && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                            {serviceDuration} mins
                          </span>
                        )}
                      </div>
                      {boundServiceResource && (
                        <p className="flex items-center text-xs font-bold text-blue-600">
                          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                          Includes Booking: {boundServiceResource.title}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        {resource.oneliner}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                    {items.map((item) => {
                      const activeVariantId = isPickupMode
                        ? item.variantIdPickup
                        : item.variantIdShipped;

                      const displayId =
                        activeVariantId ||
                        item.variantIdPickup ||
                        item.variantId;

                      let price = '0.00';
                      let currency = 'USD';
                      let variantTitle = '';

                      const variant = variants.find(
                        (v: any) => v.id === displayId
                      );

                      if (variant) {
                        price = variant.price?.amount || '0.00';
                        currency = variant.price?.currencyCode || 'USD';
                        variantTitle = getCleanVariantTitle(variant);
                      } else if (variants.length > 0 && !variantTitle) {
                        const v = variants[0];
                        price = v.price?.amount || '0.00';
                        currency = v.price?.currencyCode || 'USD';
                        variantTitle = getCleanVariantTitle(v);
                      }

                      return (
                        <div
                          key={`${item.resourceId}_${displayId}`}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold text-gray-700">
                              {variantTitle &&
                                variantTitle !== 'Default Title' && (
                                  <span>{variantTitle}</span>
                                )}
                            </div>
                            {isPickupMode && !isService && (
                              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-800">
                                Store Pickup
                              </span>
                            )}
                          </div>

                          <div className="flex items-center">
                            <div className="mr-6 text-right">
                              <p className="text-sm font-bold text-gray-900">
                                {price && parseFloat(price) > 0
                                  ? `${(parseFloat(price) * item.quantity).toFixed(2)} ${currency}`
                                  : 'No Charge'}
                              </p>
                            </div>

                            {isService ? (
                              <button
                                onClick={() =>
                                  addQueue.set([
                                    ...addQueue.get(),
                                    {
                                      resourceId: item.resourceId,
                                      action: 'remove',
                                      variantId: item.variantId,
                                    },
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
                                    dispatchDualAction(item, 'remove')
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
                                    dispatchDualAction(item, 'add')
                                  }
                                  className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
