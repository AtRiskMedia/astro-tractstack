import { useState, useEffect, useMemo } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { ulid } from 'ulid';
import { useStore } from '@nanostores/react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import {
  cartState,
  cartStore,
  customerDetails,
  setCustomerDetails,
  shopifyData,
  CART_STATES,
} from '@/stores/shopify';
import { bookingHelpers } from '@/utils/api/bookingHelpers';
import { NativeBookingCalendar } from './NativeBookingCalendar';
import type { ResourceNode } from '@/types/compositorTypes';

type CheckoutState =
  | 'IDENTITY_EMAIL'
  | 'IDENTITY_NEW_USER'
  | 'BOOKING'
  | 'SUMMARY'
  | 'PROCESSING'
  | 'SUCCESS';

interface CheckoutModalProps {
  resources?: ResourceNode[];
}

export default function CheckoutModal({ resources = [] }: CheckoutModalProps) {
  const $globalCartState = useStore(cartState);
  const $cartItems = useStore(cartStore);
  const $customer = useStore(customerDetails);
  const $shopify = useStore(shopifyData);

  const [internalState, setInternalState] =
    useState<CheckoutState>('IDENTITY_EMAIL');
  const [email, setEmail] = useState($customer.email || '');
  const [name, setName] = useState('');
  const [codeword, setCodeword] = useState('');

  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOpen =
    $globalCartState === CART_STATES.CHECKOUT ||
    $globalCartState === CART_STATES.BOOKING ||
    $globalCartState === CART_STATES.SHOPIFY_HANDOFF;

  const enrichedCart = useMemo(() => {
    return Object.values($cartItems).map((item: any) => {
      const resource = resources.find((r) => r.id === item.resourceId);
      let productData: any = {};

      if (resource?.optionsPayload?.shopifyData) {
        try {
          productData = JSON.parse(resource.optionsPayload.shopifyData);
        } catch (e) {
          console.error('Failed to parse Shopify data', item.resourceId);
        }
      }

      const variants = productData?.variants || [];
      const displayId = item.variantId || item.gid;
      const variant = variants.find((v: any) => v.id === displayId);

      return {
        ...item,
        title: productData?.title || resource?.title || 'Loading...',
        price: variant?.price?.amount || '0.00',
        resource: {
          id: item.resourceId,
          needsBooking:
            resource?.categorySlug === 'service' ||
            resource?.optionsPayload?.needsBooking ||
            !!item.boundResourceId,
          duration: resource?.optionsPayload?.duration || 0,
        },
      };
    });
  }, [$cartItems, resources]);

  const needsBooking = useMemo(
    () => enrichedCart.some((item) => item.resource?.needsBooking),
    [enrichedCart]
  );

  const needsPayment = useMemo(
    () =>
      enrichedCart.some(
        (item) => (item.gid || item.variantId) && parseFloat(item.price) > 0
      ),
    [enrichedCart]
  );

  const totalDuration = useMemo(() => {
    const rawMinutes = enrichedCart.reduce(
      (acc, item) =>
        acc + (item.resource?.duration || 0) * (item.quantity || 1),
      0
    );
    const snapped = Math.ceil(rawMinutes / 15) * 15;
    return Math.min(snapped, 120);
  }, [enrichedCart]);

  useEffect(() => {
    if ($globalCartState === CART_STATES.CHECKOUT) {
      if ($customer.leadId) {
        setInternalState(needsBooking ? 'BOOKING' : 'SUMMARY');
      } else {
        setInternalState('IDENTITY_EMAIL');
      }
    }
  }, [$globalCartState, needsBooking, $customer.leadId]);

  const handleClose = async () => {
    if ($customer.traceId && internalState !== 'SUCCESS') {
      try {
        await bookingHelpers.releaseHold($customer.traceId);
      } catch (err) {
        console.error('Failed to release hold on close', err);
      }
      setCustomerDetails({ traceId: '' });
    }
    cartState.set(CART_STATES.READY);
    setInternalState('IDENTITY_EMAIL');
    setError(null);
  };

  const handleEmailLookup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInternalState('PROCESSING');

    try {
      const response: any = await bookingHelpers.lookupLead(email);

      if (response && response.exists && response.leadId) {
        setCustomerDetails({
          ...$customer,
          email,
          leadId: response.leadId,
          traceId: ulid(),
        });
        setInternalState(needsBooking ? 'BOOKING' : 'SUMMARY');
      } else {
        setInternalState('IDENTITY_NEW_USER');
      }
    } catch (err) {
      setError('Failed to verify email. Please try again.');
      setInternalState('IDENTITY_EMAIL');
    }
  };

  const handleCreateLead = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInternalState('PROCESSING');

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName: name, password: codeword }),
      });

      const data = await response.json();

      if (response.ok && data.profile?.leadId) {
        setCustomerDetails({
          ...$customer,
          email,
          leadId: data.profile.leadId,
          traceId: ulid(),
        });
        setInternalState(needsBooking ? 'BOOKING' : 'SUMMARY');
      } else {
        setError(data.error || 'Failed to create profile. Please try again.');
        setInternalState('IDENTITY_NEW_USER');
      }
    } catch (err) {
      setError('An error occurred during registration.');
      setInternalState('IDENTITY_NEW_USER');
    }
  };

  const handleSlotSelection = async (start: Date, end: Date) => {
    setSelectedSlot({ start, end });
    setError(null);
    setInternalState('PROCESSING');

    try {
      const response: any = await bookingHelpers.holdSlot(
        $customer.traceId,
        start.toISOString(),
        end.toISOString()
      );

      if (
        response &&
        (response.success || !response.error || response.status === 201)
      ) {
        if (!needsPayment) {
          setInternalState('SUCCESS');
        } else {
          setInternalState('SUMMARY');
        }
      } else {
        setError(
          response?.message || response?.error || 'Slot no longer available.'
        );
        setInternalState('BOOKING');
      }
    } catch (err) {
      setError('Error securing appointment.');
      setInternalState('BOOKING');
    }
  };

  const handleFinalCheckout = async () => {
    if (!needsPayment) {
      setInternalState('SUCCESS');
      return;
    }

    setError(null);
    setInternalState('PROCESSING');

    try {
      const response = await fetch('/api/shopify/createCart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: enrichedCart
            .filter((i) => i.gid || i.variantId)
            .map((i) => ({
              merchandiseId: i.variantId || i.gid,
              quantity: i.quantity || 1,
            })),
          email: $customer.email,
          traceId: $customer.traceId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Checkout initialization failed');
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to reach checkout.'
      );
      setInternalState('SUMMARY');
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black bg-opacity-75 backdrop-blur-sm" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-6">
              <Dialog.Title className="text-xl font-bold text-gray-900">
                Checkout
              </Dialog.Title>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                ✕
              </button>
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-6 rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {internalState === 'IDENTITY_EMAIL' && (
                <form onSubmit={handleEmailLookup} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setEmail(e.target.value)
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
                  >
                    Continue
                  </button>
                </form>
              )}

              {internalState === 'IDENTITY_NEW_USER' && (
                <form onSubmit={handleCreateLead} className="space-y-6">
                  <div>
                    <p className="mb-4 text-sm text-gray-600">
                      We couldn't find an account for <strong>{email}</strong>.
                      Please provide your details to secure this booking.
                    </p>
                    <label className="block text-sm font-bold text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setName(e.target.value)
                      }
                      className="mb-4 mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                    <label className="block text-sm font-bold text-gray-700">
                      Codeword (to unlock your account)
                    </label>
                    <input
                      type="password"
                      required
                      value={codeword}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCodeword(e.target.value)
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
                  >
                    Create Profile & Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => setInternalState('IDENTITY_EMAIL')}
                    className="mt-2 w-full text-sm font-bold text-gray-500 hover:text-gray-700"
                  >
                    ← Back to Email
                  </button>
                </form>
              )}

              {internalState === 'BOOKING' && (
                <NativeBookingCalendar
                  resourceIds={
                    enrichedCart
                      .map((item) => item.resource?.id)
                      .filter(Boolean) as string[]
                  }
                  totalDurationMinutes={totalDuration}
                  onSlotSelected={handleSlotSelection}
                />
              )}

              {internalState === 'SUMMARY' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-4 font-bold text-gray-900">
                      Order Summary
                    </h3>
                    <div className="space-y-4">
                      {enrichedCart.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-sm text-gray-700">
                            {item.title}
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            $
                            {(
                              parseFloat(item.price) * (item.quantity || 1)
                            ).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {selectedSlot && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <p className="text-xs font-bold uppercase text-gray-500">
                          Appointment
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {selectedSlot.start.toLocaleDateString()} at{' '}
                          {selectedSlot.start.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleFinalCheckout}
                    className="w-full rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
                  >
                    Complete Payment
                  </button>
                  <button
                    onClick={() =>
                      setInternalState(
                        needsBooking ? 'BOOKING' : 'IDENTITY_EMAIL'
                      )
                    }
                    className="w-full text-sm font-bold text-gray-500 hover:text-gray-700"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {internalState === 'SUCCESS' && (
                <div className="py-10 text-center">
                  <h3 className="text-2xl font-bold text-gray-900">
                    Confirmed!
                  </h3>
                  <p className="mt-3 text-sm text-gray-600">
                    Confirmation sent to {email}.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-10 w-full rounded-md bg-gray-200 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-300"
                  >
                    Return to Site
                  </button>
                </div>
              )}

              {internalState === 'PROCESSING' && (
                <div className="flex flex-col items-center py-20">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-black"></div>
                  <p className="mt-6 animate-pulse text-sm font-bold text-gray-500">
                    Syncing...
                  </p>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Portal>
  );
}
