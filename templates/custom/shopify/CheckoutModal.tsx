import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { ulid } from 'ulid';
import { useStore } from '@nanostores/react';
import { Dialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import {
  cartState,
  cartStore,
  customerDetails,
  setCustomerDetails,
  CART_STATES,
  transactionTraceId,
  isShopifyHandoff,
} from '@/stores/shopify';
import { bookingHelpers } from '@/utils/api/bookingHelpers';
import { NativeBookingCalendar } from './NativeBookingCalendar';
import { ProfileStorage } from '@/utils/profileStorage';
import type { ResourceNode } from '@/types/compositorTypes';

type CheckoutState =
  | 'IDENTITY_EMAIL'
  | 'IDENTITY_NEW_USER'
  | 'BOOKING'
  | 'SUMMARY'
  | 'PROCESSING'
  | 'SUCCESS';

interface CheckoutModalProps {
  maxLength: number;
  resources?: ResourceNode[];
}

export default function CheckoutModal({
  maxLength,
  resources = [],
}: CheckoutModalProps) {
  const $globalCartState = useStore(cartState);
  const $cartItems = useStore(cartStore);
  const $customer = useStore(customerDetails);

  const [internalState, setInternalState] =
    useState<CheckoutState>('IDENTITY_EMAIL');

  const [email, setEmail] = useState(() => {
    const profile = ProfileStorage.getProfileData();
    if (ProfileStorage.isProfileUnlocked() && profile.email)
      return profile.email;
    return $customer.email || '';
  });

  const [name, setName] = useState('');
  const [codeword, setCodeword] = useState('');
  const [shopTimeZone, setShopTimeZone] = useState<string | undefined>(
    undefined
  );
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
      const variant = (productData?.variants || []).find(
        (v: any) => v.id === (item.variantId || item.gid)
      );
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
          duration: resource?.optionsPayload?.bookingLengthMinutes || 0,
        },
      };
    });
  }, [$cartItems, resources]);

  const needsBooking = useMemo(
    () => enrichedCart.some((item) => item.resource?.needsBooking),
    [enrichedCart]
  );
  const needsPayment = useMemo(
    () => enrichedCart.some((item) => !!(item.gid || item.variantId)),
    [enrichedCart]
  );
  const totalDuration = useMemo(() => {
    const rawMinutes = enrichedCart.reduce(
      (acc, item) =>
        acc + (item.resource?.duration || 0) * (item.quantity || 1),
      0
    );
    return Math.min(Math.ceil(rawMinutes / 15) * 15, maxLength);
  }, [enrichedCart]);

  useEffect(() => {
    const profile = ProfileStorage.getProfileData();
    if (ProfileStorage.isProfileUnlocked() && profile.email) {
      setEmail(profile.email);
    } else if ($customer.email) {
      setEmail($customer.email);
    }
  }, [ProfileStorage.isProfileUnlocked(), $customer.email]);

  useEffect(() => {
    if (
      $globalCartState !== CART_STATES.CHECKOUT ||
      internalState === 'SUCCESS' ||
      internalState === 'PROCESSING'
    )
      return;

    if ($customer.leadId) {
      if (
        internalState === 'IDENTITY_EMAIL' ||
        internalState === 'IDENTITY_NEW_USER'
      ) {
        if (!transactionTraceId.get()) transactionTraceId.set(ulid());
        setInternalState(needsBooking ? 'BOOKING' : 'SUMMARY');
      }
    } else {
      if (
        internalState !== 'IDENTITY_EMAIL' &&
        internalState !== 'IDENTITY_NEW_USER'
      ) {
        setInternalState('IDENTITY_EMAIL');
      }
    }
  }, [$globalCartState, needsBooking, $customer.leadId, internalState]);

  const handleClose = async () => {
    const redirect = internalState === 'SUCCESS';
    const currentTraceId = transactionTraceId.get();
    if (currentTraceId && internalState !== 'SUCCESS') {
      try {
        await bookingHelpers.releaseHold(currentTraceId);
      } catch (err) {
        console.error('Failed to release hold on close', err);
      }
    }
    transactionTraceId.set('');
    cartState.set(CART_STATES.READY);
    setInternalState('IDENTITY_EMAIL');
    setError(null);
    if (redirect) window.location.href = `/`;
  };

  const handleEmailLookup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInternalState('PROCESSING');
    try {
      const response: any = await bookingHelpers.lookupLead(email);
      if (response && response.exists && response.leadId) {
        if (!transactionTraceId.get()) transactionTraceId.set(ulid());
        setCustomerDetails({ ...$customer, email, leadId: response.leadId });
        setInternalState(needsBooking ? 'BOOKING' : 'SUMMARY');
      } else {
        setInternalState('IDENTITY_NEW_USER');
      }
    } catch (err) {
      setError('Failed to verify email.');
      setInternalState('IDENTITY_EMAIL');
    }
  };

  const handleCreateLead = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInternalState('PROCESSING');
    try {
      const handshake = ProfileStorage.prepareHandshakeData();
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName: name,
          codeword,
          contactPersona: 'major',
          shortBio: '',
          sessionId: handshake.sessionId,
          consent: '1',
          isUpdate: false,
        }),
      });
      const data = await response.json();
      if (response.ok && data.profile?.LeadID) {
        ProfileStorage.storeProfileToken(data.token);
        ProfileStorage.setProfileData(data.profile);
        ProfileStorage.storeEncryptedCredentials(
          data.encryptedEmail,
          data.encryptedCode
        );
        ProfileStorage.storeConsent('1');

        if (!transactionTraceId.get()) transactionTraceId.set(ulid());
        setCustomerDetails({
          ...$customer,
          email: data.profile.Email,
          name: data.profile.Firstname,
          leadId: data.profile.LeadID,
        });
        setInternalState(needsBooking ? 'BOOKING' : 'SUMMARY');
      } else {
        setError(data.error || 'Registration failed.');
        setInternalState('IDENTITY_NEW_USER');
      }
    } catch (err) {
      setError('Error during registration.');
      setInternalState('IDENTITY_NEW_USER');
    }
  };

  const handleSlotSelection = async (
    start: Date,
    end: Date,
    timeZone: string
  ) => {
    setSelectedSlot({ start, end });
    setShopTimeZone(timeZone);
    setError(null);
    setInternalState('PROCESSING');
    const cartResourceIds = enrichedCart.map((item) => item.resourceId);
    try {
      const response: any = await bookingHelpers.holdSlot(
        transactionTraceId.get(),
        start.toISOString(),
        end.toISOString(),
        cartResourceIds
      );
      if (response && (response.success || response.status === 201)) {
        setInternalState('SUMMARY');
      } else {
        setError(response?.message || 'Slot no longer available.');
        setInternalState('BOOKING');
      }
    } catch (err) {
      setError('Error securing appointment.');
      setInternalState('BOOKING');
    }
  };

  const handleCancelBooking = async () => {
    const currentTraceId = transactionTraceId.get();
    if (currentTraceId) {
      setError(null);
      setInternalState('PROCESSING');
      try {
        await bookingHelpers.releaseHold(currentTraceId);
        setSelectedSlot(null);
        setInternalState('BOOKING');
      } catch (err) {
        console.error('Failed to release hold', err);
        setError('Failed to cancel the hold. Please try again.');
        setInternalState('SUMMARY');
      }
    } else {
      setSelectedSlot(null);
      setInternalState('BOOKING');
    }
  };

  const handleFinalCheckout = async () => {
    if (!needsPayment) {
      setError(null);
      setInternalState('PROCESSING');
      try {
        const response: any = await bookingHelpers.confirmBooking(
          transactionTraceId.get()
        );
        if (response && response.success) {
          cartStore.set({});
          setInternalState('SUCCESS');
        } else {
          setError(response?.error || 'Failed to confirm booking.');
          setInternalState('SUMMARY');
        }
      } catch (err) {
        setError('Error confirming booking.');
        setInternalState('SUMMARY');
      }
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
          attributes: [{ key: 'Trace ID', value: transactionTraceId.get() }],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Checkout failed');

      if (result.checkoutUrl) {
        isShopifyHandoff.set(true);
        cartStore.set({});
        cartState.set(CART_STATES.READY);
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error('No checkout URL');
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
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-1 focus:ring-black"
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
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      Email:
                    </label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500 shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      Your name:
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      Codeword to protect your account:
                    </label>
                    <input
                      type="password"
                      required
                      value={codeword}
                      onChange={(e) => setCodeword(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-1 focus:ring-black"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
                  >
                    Create Profile & Continue
                  </button>
                </form>
              )}
              {internalState === 'BOOKING' && (
                <NativeBookingCalendar
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
                    {enrichedCart.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm text-gray-700"
                      >
                        <span>{item.title}</span>
                        <span className="font-bold">
                          $
                          {(
                            parseFloat(item.price) * (item.quantity || 1)
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {selectedSlot && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <p className="text-xs font-bold uppercase text-gray-500">
                          Appointment
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {selectedSlot.start.toLocaleDateString('en-US', {
                            timeZone: shopTimeZone,
                          })}{' '}
                          at{' '}
                          {selectedSlot.start.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: shopTimeZone,
                          })}
                        </p>
                        {shopTimeZone &&
                          shopTimeZone !==
                            Intl.DateTimeFormat().resolvedOptions()
                              .timeZone && (
                            <p className="mt-1 text-xs font-bold text-gray-500">
                              (
                              {selectedSlot.start.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              local)
                            </p>
                          )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {needsBooking && (
                      <button
                        onClick={handleCancelBooking}
                        className="w-1/3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                      >
                        Go Back
                      </button>
                    )}
                    <button
                      onClick={handleFinalCheckout}
                      className="flex-1 rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
                    >
                      {needsPayment ? 'Complete Payment' : 'Complete Booking'}
                    </button>
                  </div>
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
