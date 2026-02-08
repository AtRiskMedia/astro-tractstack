import { useStore } from '@nanostores/react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import {
  addQueue,
  cartStore,
  queueState,
  QUEUE_STATES,
} from '@/stores/shopify';
import { RESTRICTION_MESSAGES } from '@/utils/customHelpers';
import type { ResourceNode } from '@/types/compositorTypes';

// Add Interface
interface CartModalProps {
  resources: ResourceNode[];
}

// Accept props
export default function CartModal({ resources = [] }: CartModalProps) {
  const qState = useStore(queueState);
  const queue = useStore(addQueue);
  // Remove headerResourcesStore usage

  const show = qState === QUEUE_STATES.HAS_REQUIREMENTS;
  const action = queue[0];

  // Find resource in the PROPS, not the store
  const resource = action
    ? resources.find((r) => r.id === action.resourceId)
    : null;

  const handleClose = () => {
    const newQueue = [...addQueue.get()];
    newQueue.shift();
    addQueue.set(newQueue);
    queueState.set(QUEUE_STATES.READY);
  };

  const handleAccept = () => {
    if (!action) return;

    const currentCart = cartStore.get();
    const currentItem = currentCart[action.resourceId];
    const currentQty = currentItem?.quantity || 0;
    const newQty = currentQty + 1;

    cartStore.setKey(action.resourceId, {
      resourceId: action.resourceId,
      quantity: newQty,
      variantId: currentItem?.variantId || action.variantId,
      gid: currentItem?.gid || resource?.optionsPayload?.gid,
    });

    const newQueue = [...addQueue.get()];
    newQueue.shift();
    addQueue.set(newQueue);
    queueState.set(QUEUE_STATES.READY);
  };

  if (!show || !resource) return null;

  const bookingDuration = resource.optionsPayload?.bookingLengthMinutes;

  return (
    <Dialog.Root open={show} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <Dialog.Title className="text-xl font-bold text-gray-900">
                {bookingDuration ? 'Booking Required' : 'Terms & Conditions'}
              </Dialog.Title>

              <div className="mt-4 text-gray-600">
                {bookingDuration ? (
                  <p>{RESTRICTION_MESSAGES.BOOKING(bookingDuration)}</p>
                ) : (
                  <p>{RESTRICTION_MESSAGES.TERMS}</p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  {bookingDuration ? 'Continue' : 'Accept'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
