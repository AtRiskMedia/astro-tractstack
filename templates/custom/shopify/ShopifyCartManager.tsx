import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import {
  addQueue,
  cartStore,
  modalState,
  transactionTraceId,
} from '@/stores/shopify';
import { bookingHelpers } from '@/utils/api/bookingHelpers';
import { RESTRICTION_MESSAGES } from '@/custom/shopify/shopifyCustomHelper';
import {
  calculateCartDuration,
  getCartItemKey,
  isSharedFeeService,
} from '@/custom/shopify/shopifyHelpers';
import { wouldCartHaveImpossibleRemoteMix } from '@/custom/shopify/appointmentMode';
import type { ResourceNode } from '@/types/compositorTypes';
import type { CartItemState } from '@/stores/shopify';
import type { BrandConfigState } from '@/types/tractstack';

interface ShopifyCartManagerProps {
  resources?: ResourceNode[];
  brandConfig?: BrandConfigState;
}

export default function ShopifyCartManager({
  resources = [],
  brandConfig,
}: ShopifyCartManagerProps) {
  const queue = useStore(addQueue);
  const productResources = resources.filter(
    (r) => r.categorySlug === 'product'
  );

  useEffect(() => {
    if (queue.length > 0) {
      const actionItem = queue[0];
      const remaining = queue.slice(1);
      const resource = resources.find((r) => r.id === actionItem.resourceId);

      if (!resource) {
        addQueue.set(remaining);
        return;
      }

      const key = getCartItemKey(actionItem, resource, productResources);
      const currentCart = cartStore.get();
      const currentItem = currentCart[key];
      const isSharedFeeResource = isSharedFeeService(
        resource,
        productResources
      );
      const legacySharedKeys = isSharedFeeResource
        ? Object.keys(currentCart).filter(
            (cartKey) =>
              cartKey !== key &&
              currentCart[cartKey]?.resourceId === actionItem.resourceId
          )
        : [];
      const legacySharedItems = legacySharedKeys
        .map((cartKey) => currentCart[cartKey])
        .filter((item): item is CartItemState => !!item);
      const mergedCurrentItem = currentItem || legacySharedItems[0];
      const currentQty = isSharedFeeResource
        ? currentItem?.quantity ||
          legacySharedItems.reduce((total, item) => total + item.quantity, 0)
        : currentItem?.quantity || 0;
      const nextCart = { ...currentCart };

      if (actionItem.action === 'remove') {
        const newQty = isSharedFeeResource ? 0 : Math.max(0, currentQty - 1);

        if (newQty === 0) {
          if (
            resource?.optionsPayload?.needsBooking ||
            mergedCurrentItem?.boundResourceId
          ) {
            const traceId = transactionTraceId.get();
            if (traceId) {
              bookingHelpers
                .releaseHold(traceId)
                .catch((err) =>
                  console.error('Failed to release hold on cart removal:', err)
                )
                .finally(() => {
                  transactionTraceId.set('');
                });
            }
          }
          delete nextCart[key];
          legacySharedKeys.forEach((legacyKey) => {
            delete nextCart[legacyKey];
          });
        } else {
          nextCart[key] = {
            ...mergedCurrentItem,
            resourceId: actionItem.resourceId,
            quantity: newQty,
          };
        }

        if (mergedCurrentItem?.boundResourceId || actionItem.boundResourceId) {
          const boundId =
            mergedCurrentItem?.boundResourceId || actionItem.boundResourceId;
          if (boundId) {
            const boundResource = resources.find((r) => r.id === boundId);
            const serviceKey = getCartItemKey(
              { resourceId: boundId },
              boundResource,
              productResources
            );
            const serviceItem = nextCart[serviceKey];
            if (serviceItem) {
              const newServiceQty = Math.max(0, serviceItem.quantity - 1);
              if (newServiceQty === 0) {
                delete nextCart[serviceKey];
              } else {
                nextCart[serviceKey] = {
                  ...serviceItem,
                  quantity: newServiceQty,
                };
              }
            }
          }
        }

        cartStore.set(nextCart);
        addQueue.set(remaining);
      } else if (actionItem.action === 'add') {
        transactionTraceId.set('');
        const newQty = isSharedFeeResource ? 1 : currentQty + 1;

        const newItem: CartItemState = {
          resourceId: actionItem.resourceId,
          quantity: newQty,
          gid: actionItem.gid || mergedCurrentItem?.gid,
          variantId: isSharedFeeResource
            ? undefined
            : actionItem.variantId || mergedCurrentItem?.variantId,
          variantIdShipped:
            actionItem.variantIdShipped || mergedCurrentItem?.variantIdShipped,
          variantIdPickup:
            actionItem.variantIdPickup || mergedCurrentItem?.variantIdPickup,
          boundResourceId:
            actionItem.boundResourceId || mergedCurrentItem?.boundResourceId,
        };

        legacySharedKeys.forEach((legacyKey) => {
          delete nextCart[legacyKey];
        });
        nextCart[key] = newItem;

        if (newItem.boundResourceId) {
          const boundResource = resources.find(
            (r) => r.id === newItem.boundResourceId
          );
          const serviceKey = getCartItemKey(
            {
              resourceId: newItem.boundResourceId,
            },
            boundResource,
            productResources
          );
          const serviceItem = nextCart[serviceKey];

          if (serviceItem) {
            nextCart[serviceKey] = {
              ...serviceItem,
              quantity: serviceItem.quantity + 1,
            };
          } else {
            nextCart[serviceKey] = {
              resourceId: newItem.boundResourceId,
              quantity: 1,
            };
          }
        }

        if (wouldCartHaveImpossibleRemoteMix(nextCart, resources)) {
          modalState.set({
            isOpen: true,
            type: 'restriction',
            title: 'Incompatible Booking Modes',
            message: RESTRICTION_MESSAGES.INCOMPATIBLE_REMOTE,
          });
        } else {
          const rawDuration = calculateCartDuration(nextCart, resources);

          const interval = 15;
          const snappedDuration = Math.ceil(rawDuration / interval) * interval;

          const dynamicMax = brandConfig?.scheduling?.maxLengthMinutes || 180;
          if (snappedDuration > dynamicMax) {
            modalState.set({
              isOpen: true,
              type: 'restriction',
              title: 'Appointment Length Limit Reached',
              message: RESTRICTION_MESSAGES.MAX_DURATION(dynamicMax),
            });
          } else {
            cartStore.set(nextCart);

            if (!actionItem.suppressModal) {
              let targetResource = resource;
              if (newItem.boundResourceId) {
                const bound = resources.find(
                  (r) => r.id === newItem.boundResourceId
                );
                if (bound) {
                  targetResource = bound;
                }
              }

              if (
                targetResource.categorySlug === 'service' ||
                targetResource.optionsPayload?.needsBooking
              ) {
                modalState.set({
                  isOpen: true,
                  type: 'success',
                  title: 'Booking Required',
                  message: RESTRICTION_MESSAGES.BOOKING(
                    (
                      targetResource.optionsPayload?.bookingLengthMinutes || 0
                    ).toString()
                  ),
                });
              } else {
                modalState.set({
                  isOpen: true,
                  type: 'success',
                  title: 'Added to Cart',
                  message: RESTRICTION_MESSAGES.DEFAULT_ADD(
                    targetResource.title
                  ),
                });
              }
            }
          }
        }

        addQueue.set(remaining);
      }
    }
  }, [queue, resources, brandConfig]);

  return null;
}
