import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore, cartState, CART_STATES, isShopifyHandoff } from '@/stores/shopify';
import { calculateCartDuration } from '@/utils/customHelpers';
import type { ResourceNode } from '@/types/compositorTypes';

interface ShopifyCheckoutProps {
  traceId: string;
  email: string;
  resources: ResourceNode[];
  onError: (error: string) => void;
}

export default function ShopifyCheckout({
  traceId,
  email,
  resources = [],
  onError,
}: ShopifyCheckoutProps) {
  const cart = useStore(cartStore);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'REDIRECTING'>(
    'IDLE'
  );

  useEffect(() => {
    if (status !== 'IDLE') return;

    const initCheckout = async () => {
      setStatus('PROCESSING');

      try {
        const cartItems = Object.values(cart);

        // Determine if we are in "Pickup Mode" (Service exists in cart)
        const duration = calculateCartDuration(cart, resources);
        const isPickupMode = duration > 0;

        const lines = cartItems
          .map((item) => {
            // 1. Resolve the ResourceNode for this item
            const resource = resources.find((r) => r.id === item.resourceId);

            if (!resource) {
              return null;
            }

            // 2. Determine the preferred Variant ID based on mode
            const activeVariantId = isPickupMode
              ? item.variantIdPickup
              : item.variantIdShipped;

            // 3. Establish the specific ID to use from the cart state
            let merchandiseId =
              activeVariantId || item.variantIdPickup || item.variantId;

            // 4. FALLBACK LOGIC (Mirrors Cart.tsx)
            // If no specific variant ID is saved on the cart item,
            // look up the Default Variant from the Resource data.
            if (!merchandiseId && resource?.optionsPayload?.shopifyData) {
              try {
                const product = JSON.parse(resource.optionsPayload.shopifyData);
                // If the product has variants, default to the first one
                if (product.variants && product.variants.length > 0) {
                  merchandiseId = product.variants[0].id;
                }
              } catch (e) {
                console.warn(
                  'ShopifyCheckout: Failed to parse shopifyData for fallback',
                  item.resourceId
                );
              }
            }

            // If we still have no ID, we cannot add this item to the Shopify cart.
            if (!merchandiseId) return null;

            return {
              merchandiseId,
              quantity: item.quantity,
            };
          })
          .filter((line) => line !== null) as Array<{
            merchandiseId: string;
            quantity: number;
          }>;

        if (lines.length === 0) {
          throw new Error(
            'No valid Shopify items found in cart. Please try removing and re-adding your items.'
          );
        }

        const payload = {
          lines,
          email,
          attributes: [
            {
              key: 'Trace ID',
              value: traceId,
            },
          ],
        };

        const response = await fetch('/api/shopify/createCart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || 'Failed to create checkout');
        }

        if (result.checkoutUrl) {
          setStatus('REDIRECTING');
          isShopifyHandoff.set(true);
          cartStore.set({});
          cartState.set(CART_STATES.READY);
          window.location.href = result.checkoutUrl;
        } else {
          throw new Error('No checkout URL returned from Shopify');
        }
      } catch (err) {
        console.error('Checkout Error:', err);
        setStatus('IDLE');
        onError(err instanceof Error ? err.message : 'Checkout failed');
      }
    };

    initCheckout();
  }, [cart, email, traceId, resources, status, onError]);

  return (
    <div className="flex h-64 flex-col items-center justify-center text-center">
      {status === 'REDIRECTING' ? (
        <>
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-green-500"></div>
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            Redirecting to Payment...
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Please wait while we transfer you to Shopify.
          </p>
        </>
      ) : (
        <>
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-black"></div>
          <h3 className="mt-4 text-lg font-bold text-gray-900">
            Preparing your Invoice
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Syncing booking details and calculating totals...
          </p>
        </>
      )}
    </div>
  );
}
