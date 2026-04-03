import { customerDetails, cartStore } from '@/stores/shopify';
import type { ResourceNode } from '@/types/compositorTypes';

export const bookingHelpers = {
  /**
   * Checks if a user profile already exists for a given email via the BFF.
   */
  lookupLead: async (email: string) => {
    const response = await fetch('/api/auth/lookup-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  },

  /**
   * Asks backend for availability slots
   */
  getAvailability: async (start: string, end: string) => {
    const query = new URLSearchParams({
      start,
      end,
    });
    const response = await fetch(
      `/api/booking/availability?${query.toString()}`
    );
    return await response.json();
  },

  /**
   * Places a temporary hold on a specific slot for the manifest of services and pickup products.
   */
  holdSlot: async (
    traceId: string,
    startTime: string,
    endTime: string,
    resources: ResourceNode[]
  ) => {
    const details = customerDetails.get();
    const cart = cartStore.get();

    const resourceIds = Object.values(cart)
      .filter((item) => {
        const resource = resources.find((r) => r.id === item.resourceId);
        if (!resource) return false;

        const isService =
          resource.categorySlug === 'service' ||
          !!resource.optionsPayload?.bookingLengthMinutes ||
          !!resource.optionsPayload?.needsBooking;

        const isPickupProduct =
          !!item.variantIdPickup && item.variantId === item.variantIdPickup;

        return isService || isPickupProduct;
      })
      .map((item) => item.resourceId);

    const response = await fetch('/api/booking/hold', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        traceId,
        leadId: details.leadId,
        resourceIds,
        startTime,
        endTime,
      }),
    });
    return await response.json();
  },

  /**
   * Releases a temporary hold, typically used when a user abandons checkout.
   */
  releaseHold: async (traceId: string) => {
    const response = await fetch('/api/booking/release', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ traceId }),
    });
    return await response.json();
  },
};
