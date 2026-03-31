import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import {
  addQueue,
  cartStore,
  modalState,
  customerDetails,
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

      if (actionItem.action === 'remove') {
        const newQty = Math.max(0, currentQty - 1);

        if (newQty === 0) {
          // Release hold if it was a booking item
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

          const newCart = { ...currentCart };
          delete newCart[key];
          cartStore.set(newCart);
        } else {
          cartStore.setKey(key, {
            ...currentItem,
            resourceId: actionItem.resourceId,
            quantity: newQty,
          });
        }

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

        const nextCart: Record<string, CartItemState> = {
          ...currentCart,
          [key]: newItem,
        };

        if (actionItem.boundResourceId) {
          const serviceEntry = Object.entries(currentCart).find(
            ([_, item]) => item.resourceId === actionItem.boundResourceId
          );

          if (serviceEntry) {
            const [serviceKey, serviceItem] = serviceEntry;
            nextCart[serviceKey] = {
              ...serviceItem,
              quantity: serviceItem.quantity + 1,
            };
          } else {
            nextCart[`temp_service_${actionItem.boundResourceId}`] = {
              resourceId: actionItem.boundResourceId,
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
          cartStore.setKey(key, newItem);

          if (!actionItem.suppressModal) {
            if (
              resource.categorySlug === 'service' ||
              resource.optionsPayload?.needsBooking
            ) {
              modalState.set({
                isOpen: true,
                type: 'success',
                title: 'Booking Required',
                message: RESTRICTION_MESSAGES.BOOKING(
                  (
                    resource.optionsPayload?.bookingLengthMinutes || 0
                  ).toString()
                ),
              });
            } else {
              modalState.set({
                isOpen: true,
                type: 'success',
                title: 'Added to Cart',
                message: RESTRICTION_MESSAGES.DEFAULT_ADD(resource.title),
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
