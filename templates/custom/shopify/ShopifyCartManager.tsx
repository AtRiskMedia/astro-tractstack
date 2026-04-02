import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import {
  addQueue,
  cartStore,
  modalState,
  transactionTraceId,
} from '@/stores/shopify';
import { bookingHelpers } from '@/utils/api/bookingHelpers';
import {
  MAX_LENGTH_MINUTES,
  RESTRICTION_MESSAGES,
} from '@/utils/customHelpers';
import type { ResourceNode } from '@/types/compositorTypes';
import type { CartItemState } from '@/stores/shopify';

interface ShopifyCartManagerProps {
  resources?: ResourceNode[];
}

export default function ShopifyCartManager({
  resources = [],
}: ShopifyCartManagerProps) {
  const queue = useStore(addQueue);

  useEffect(() => {
    if (queue.length > 0) {
      const actionItem = queue[0];
      const remaining = queue.slice(1);
      const resource = resources.find((r) => r.id === actionItem.resourceId);

      if (!resource) {
        addQueue.set(remaining);
        return;
      }

      const key =
        actionItem.variantId ||
        `${actionItem.resourceId}_${actionItem.variantIdShipped || 'null'}_${
          actionItem.variantIdPickup || 'null'
        }`;

      const currentCart = cartStore.get();
      const currentItem = currentCart[key];
      const currentQty = currentItem?.quantity || 0;
      const nextCart = { ...currentCart };

      if (actionItem.action === 'remove') {
        const newQty = Math.max(0, currentQty - 1);

        if (newQty === 0) {
          if (
            resource?.optionsPayload?.needsBooking ||
            currentItem?.boundResourceId
          ) {
            const traceId = transactionTraceId.get();
            if (traceId) {
              bookingHelpers
                .releaseHold(traceId)
                .catch((err) =>
                  console.error('Failed to release hold on cart removal:', err)
                );
            }
          }
          delete nextCart[key];
        } else {
          nextCart[key] = {
            ...currentItem,
            resourceId: actionItem.resourceId,
            quantity: newQty,
          };
        }

        if (currentItem?.boundResourceId || actionItem.boundResourceId) {
          const boundId =
            currentItem?.boundResourceId || actionItem.boundResourceId;
          const serviceEntry = Object.entries(nextCart).find(
            ([_, item]) => item.resourceId === boundId
          );
          if (serviceEntry) {
            const [serviceKey, serviceItem] = serviceEntry;
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

        cartStore.set(nextCart);
        addQueue.set(remaining);
      } else if (actionItem.action === 'add') {
        const newQty = currentQty + 1;

        const newItem: CartItemState = {
          resourceId: actionItem.resourceId,
          quantity: newQty,
          gid: actionItem.gid || currentItem?.gid,
          variantId: actionItem.variantId || currentItem?.variantId,
          variantIdShipped:
            actionItem.variantIdShipped || currentItem?.variantIdShipped,
          variantIdPickup:
            actionItem.variantIdPickup || currentItem?.variantIdPickup,
          boundResourceId:
            actionItem.boundResourceId || currentItem?.boundResourceId,
        };

        nextCart[key] = newItem;

        if (newItem.boundResourceId) {
          const serviceEntry = Object.entries(nextCart).find(
            ([_, item]) => item.resourceId === newItem.boundResourceId
          );

          if (serviceEntry) {
            const [serviceKey, serviceItem] = serviceEntry;
            nextCart[serviceKey] = {
              ...serviceItem,
              quantity: serviceItem.quantity + 1,
            };
          } else {
            nextCart[`temp_service_${newItem.boundResourceId}`] = {
              resourceId: newItem.boundResourceId,
              quantity: 1,
            };
          }
        }

        let rawDuration = 0;
        Object.values(nextCart).forEach((item) => {
          const res = resources.find((r) => r.id === item.resourceId);
          if (res?.optionsPayload?.needsBooking || item.boundResourceId) {
            rawDuration +=
              (res?.optionsPayload?.bookingLengthMinutes || 0) *
              (item.quantity || 1);
          }
        });

        const interval = 15;
        const snappedDuration = Math.ceil(rawDuration / interval) * interval;

        if (snappedDuration > (MAX_LENGTH_MINUTES || 120)) {
          modalState.set({
            isOpen: true,
            type: 'restriction',
            title: 'Appointment Length Limit Reached',
            message: RESTRICTION_MESSAGES.MAX_DURATION(
              MAX_LENGTH_MINUTES || 120
            ),
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
                message: RESTRICTION_MESSAGES.DEFAULT_ADD(targetResource.title),
              });
            }
          }
        }

        addQueue.set(remaining);
      }
    }
  }, [queue, resources]);

  return null;
}
