import { useState, useEffect, type FormEvent } from 'react';
import { useStore } from '@nanostores/react';
import { ulid } from 'ulid';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import {
  cartState,
  cartStore,
  customerDetails,
  CART_STATES,
} from '@/stores/shopify';
import CalDotComBooking from './CalDotComBooking';
import ShopifyCheckout from './ShopifyCheckout';
import { calculateCartDuration, getBookingBucket } from '@/utils/customHelpers';
import type { ResourceNode } from '@/types/compositorTypes';

interface CheckoutModalProps {
  resources: ResourceNode[];
}

export default function CheckoutModal({ resources = [] }: CheckoutModalProps) {
  const state = useStore(cartState);
  const cart = useStore(cartStore);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [traceId, setTraceId] = useState('');

  const duration = calculateCartDuration(cart, resources);
  const bookingSlug = getBookingBucket(duration);
  const needsBooking = !!bookingSlug;

  const needsPayment = Object.values(cart).some((item) => {
    if (item.gid) return true;
    const resource = resources.find((r) => r.id === item.resourceId);
    return !!resource?.optionsPayload?.gid;
  });

  const isOpen =
    state === CART_STATES.CHECKOUT ||
    state === CART_STATES.BOOKING ||
    state === CART_STATES.SHOPIFY_HANDOFF;

  useEffect(() => {
    if (state === CART_STATES.CHECKOUT && !traceId) {
      setTraceId(ulid());
      const saved = customerDetails.get();
      if (saved.name) setName(saved.name);
      if (saved.email) setEmail(saved.email);
    }
    if (state === CART_STATES.READY) {
      setTraceId('');
    }
  }, [state, traceId]);

  const handleClose = () => {
    cartState.set(CART_STATES.READY);
  };

  const handleIdentitySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    customerDetails.set({ name, email });

    if (needsBooking) {
      cartState.set(CART_STATES.BOOKING);
    } else if (needsPayment) {
      cartState.set(CART_STATES.SHOPIFY_HANDOFF);
    } else {
      cartState.set(CART_STATES.READY);
    }
  };

  const handleBookingSuccess = () => {
    if (needsPayment) {
      cartState.set(CART_STATES.SHOPIFY_HANDOFF);
    } else {
      alert('Booking Confirmed!');
      cartStore.set({});
      cartState.set(CART_STATES.READY);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black bg-opacity-75 backdrop-blur-sm" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
            {state === CART_STATES.CHECKOUT && (
              <div className="p-6">
                <Dialog.Title className="text-xl font-bold text-gray-900">
                  Checkout Details
                </Dialog.Title>
                <div className="mt-2 text-sm text-gray-500">
                  Please provide your details to continue.
                </div>

                <form
                  onSubmit={handleIdentitySubmit}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-md bg-gray-200 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              </div>
            )}

            {state === CART_STATES.BOOKING && bookingSlug && (
              <div className="w-full overflow-hidden" style={{ height: 600 }}>
                <CalDotComBooking
                  calSlug={bookingSlug}
                  traceId={traceId}
                  name={name}
                  email={email}
                  onSuccess={handleBookingSuccess}
                />
              </div>
            )}

            {state === CART_STATES.SHOPIFY_HANDOFF && (
              <div className="p-6">
                <ShopifyCheckout
                  resources={resources}
                  traceId={traceId}
                  email={email}
                  onError={() => {
                    console.error('Hand-off failed');
                  }}
                />
              </div>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
