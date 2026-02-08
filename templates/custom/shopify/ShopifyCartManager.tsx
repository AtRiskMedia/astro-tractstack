import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import {
  addQueue,
  cartStore,
  queueState,
  QUEUE_STATES,
} from '@/stores/shopify';
import { checkRestrictions } from '@/utils/customHelpers';
import type { ResourceNode } from '@/types/compositorTypes';

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
      const resource = resources.find((r) => r.id === actionItem.resourceId);

      if (!resource) {
        const remaining = queue.slice(1);
        addQueue.set(remaining);
        return;
      }

      const hasRestrictions = checkRestrictions(resource);

      if (hasRestrictions && actionItem.action === 'add') {
        queueState.set(QUEUE_STATES.HAS_REQUIREMENTS);
      } else {
        const currentItem = cartStore.get()[actionItem.resourceId];
        const currentQty = currentItem?.quantity || 0;

        let newQty = currentQty;
        if (actionItem.action === 'add') {
          newQty += 1;
        } else if (actionItem.action === 'remove') {
          newQty = Math.max(0, newQty - 1);
        }

        if (newQty === 0) {
          const newCart = { ...cartStore.get() };
          delete newCart[actionItem.resourceId];
          cartStore.set(newCart);
        } else {
          cartStore.setKey(actionItem.resourceId, {
            resourceId: actionItem.resourceId,
            quantity: newQty,
          });
        }

        const remaining = queue.slice(1);
        addQueue.set(remaining);
      }
    }
  }, [queue, resources]);

  return null;
}
