import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { addQueue, cartStore, modalState } from '@/stores/shopify';
import {
  calculateCartDuration,
  MAX_LENGTH_MINUTES,
  RESTRICTION_MESSAGES,
} from '@/utils/customHelpers';
import type { ResourceNode } from '@/types/compositorTypes';
import type { CartItemState } from '@/stores/shopify';

interface ShopifyCartManagerProps {
  resources: ResourceNode[];
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
          const newCart = { ...currentCart };
          delete newCart[key];
          cartStore.set(newCart);
        } else {
          cartStore.setKey(key, {
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
          });
        }

        addQueue.set(remaining);
      } else if (actionItem.action === 'add') {
        const newQty = currentQty + 1;

        const newItem = {
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

        const duration = calculateCartDuration(nextCart, resources);
        const bookingDuration = resource.optionsPayload?.bookingLengthMinutes;

        if (duration > MAX_LENGTH_MINUTES) {
          modalState.set({
            isOpen: true,
            type: 'restriction',
            title: 'Appointment Length Limit Reached',
            message: RESTRICTION_MESSAGES.MAX_DURATION(MAX_LENGTH_MINUTES),
          });
        } else {
          cartStore.setKey(key, newItem);

          if (!actionItem.suppressModal) {
            if (resource.categorySlug === 'service') {
              modalState.set({
                isOpen: true,
                type: 'success',
                title: 'Booking Required',
                message: RESTRICTION_MESSAGES.BOOKING(
                  (bookingDuration || 0).toString()
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
