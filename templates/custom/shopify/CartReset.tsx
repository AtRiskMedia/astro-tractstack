import { useEffect } from 'react';
import {
  resetShopifyCommerceState,
  transactionTraceId,
} from '@/stores/shopify';
import { bookingHelpers } from '@/utils/api/bookingHelpers';

export default function CartReset() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const traceId = transactionTraceId.get();
      if (traceId) {
        try {
          await bookingHelpers.releaseHold(traceId);
        } catch (err) {
          console.error('Failed to release hold during cart reset:', err);
        }
      }

      if (cancelled) {
        return;
      }

      resetShopifyCommerceState();
      window.location.replace('/cart');
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return <p className="text-center text-sm text-gray-600">Resetting cart…</p>;
}
